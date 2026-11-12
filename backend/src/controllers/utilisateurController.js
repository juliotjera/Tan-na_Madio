// Gestion des comptes par l'administrateur (création du personnel, activation)
const bcrypt = require('bcryptjs')
const db = require('../config/db')
const { User, Camion, journaliser } = require('../models')
const { verifierMotDePasse, TOURS_BCRYPT } = require('./authController')
const { ErreurApi, asyncHandler, pagination } = require('../utils/helpers')

const ROLES = ['citoyen', 'agent_municipal', 'chauffeur', 'administrateur']

const lister = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query)
  if (req.query.role && !ROLES.includes(req.query.role)) throw new ErreurApi(400, 'Rôle inconnu', 'FILTRE_INVALIDE')
  const resultat = await User.lister({ role: req.query.role, recherche: req.query.q?.trim(), limit, offset })
  res.json({ ...resultat, page, limit })
})

const detail = asyncHandler(async (req, res) => {
  const u = await User.profil(req.params.id)
  if (!u) throw new ErreurApi(404, 'Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE')
  res.json(u)
})

// Agents, chauffeurs et administrateurs : créés uniquement ici (jamais par l'inscription publique)
const creer = asyncHandler(async (req, res) => {
  const { nom, prenom, email, mot_de_passe, role, telephone, extras = {} } = req.body
  if (!ROLES.includes(role)) throw new ErreurApi(400, 'Rôle inconnu', 'ROLE_INVALIDE')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) throw new ErreurApi(400, 'Adresse e-mail invalide', 'EMAIL_INVALIDE')
  if (role === 'agent_municipal' && !extras.matricule?.trim()) throw new ErreurApi(400, 'Le matricule est obligatoire pour un agent', 'CHAMPS_MANQUANTS')
  if (role === 'chauffeur' && !extras.numero_permis?.trim()) throw new ErreurApi(400, 'Le numéro de permis est obligatoire pour un chauffeur', 'CHAMPS_MANQUANTS')
  verifierMotDePasse(mot_de_passe)
  if (await User.parEmail(email)) throw new ErreurApi(409, 'Cette adresse e-mail est déjà utilisée', 'EMAIL_EXISTANT')

  const u = await User.creer({ nom, prenom, email, telephone, role, motDePasseHash: await bcrypt.hash(mot_de_passe, TOURS_BCRYPT), extras })
  // affectation du camion tenue à jour des deux côtés (camion ↔ chauffeur)
  if (role === 'chauffeur' && extras.camion_id) await Camion.modifier(extras.camion_id, { chauffeur_id: u.id })
  await journaliser(req, 'creation', 'utilisateur', u.id, { role })
  res.status(201).json(await User.profil(u.id))
})

// Modification des informations de base ; un utilisateur peut aussi modifier son propre profil
const modifier = asyncHandler(async (req, res) => {
  if (req.user.role !== 'administrateur' && req.user.id !== req.params.id) throw new ErreurApi(403, 'Modification non autorisée', 'ACCES_REFUSE')
  const u = await User.modifier(req.params.id, req.body)
  if (!u) throw new ErreurApi(404, 'Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE')
  if (req.body.quartier !== undefined) await db.query('UPDATE citoyens SET quartier = $2 WHERE id = $1', [u.id, req.body.quartier || null])
  if (req.user.role === 'administrateur' && req.body.zone_id !== undefined) {
    await db.query('UPDATE agents_municipaux SET zone_id = $2 WHERE id = $1', [u.id, req.body.zone_id || null])
  }
  await journaliser(req, 'modification', 'utilisateur', u.id)
  res.json(await User.profil(u.id))
})

const activer = asyncHandler(async (req, res) => {
  if (typeof req.body.actif !== 'boolean') throw new ErreurApi(400, 'Indiquez actif : true ou false', 'CHAMPS_MANQUANTS')
  if (req.params.id === req.user.id && !req.body.actif) throw new ErreurApi(422, 'Vous ne pouvez pas désactiver votre propre compte', 'AUTO_DESACTIVATION')
  const u = await User.activer(req.params.id, req.body.actif)
  if (!u) throw new ErreurApi(404, 'Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE')
  // compte désactivé : ses sessions sont fermées immédiatement
  if (!u.actif) await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [u.id])
  await journaliser(req, u.actif ? 'activation' : 'desactivation', 'utilisateur', u.id)
  res.json(u)
})

// Suppression d'un compte sans historique ; un compte qui a des signalements ou des tournées est
// conservé pour la traçabilité : il faut alors le désactiver
const supprimer = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ErreurApi(422, 'Vous ne pouvez pas supprimer votre propre compte', 'AUTO_SUPPRESSION')
  const u = await User.profil(req.params.id)
  if (!u) throw new ErreurApi(404, 'Utilisateur introuvable', 'UTILISATEUR_INTROUVABLE')
  const { rows } = await db.query(
    `SELECT (SELECT count(*) FROM signalements WHERE citoyen_id = $1)::int AS signalements,
            (SELECT count(*) FROM collectes WHERE agent_id = $1)::int AS collectes`,
    [u.id],
  )
  if (rows[0].signalements || rows[0].collectes) {
    throw new ErreurApi(422, 'Ce compte a un historique (signalements ou tournées) : désactivez-le plutôt', 'COMPTE_AVEC_HISTORIQUE')
  }
  await db.transaction(async (tx) => {
    await tx.query('UPDATE camions SET chauffeur_id = NULL WHERE chauffeur_id = $1', [u.id])
    await tx.query('DELETE FROM utilisateurs WHERE id = $1', [u.id])
  })
  await journaliser(req, 'suppression', 'utilisateur', null, { email: u.email, role: u.role })
  res.json({ message: 'Compte supprimé' })
})

// Journal d'activité (traçabilité)
const journal = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query)
  const { rows } = await db.query(
    `SELECT l.id, l.action, l.entite, l.entite_id, l.details, host(l.ip_address) AS ip, l.created_at,
            u.prenom || ' ' || u.nom AS utilisateur, u.role
       FROM logs_activite l LEFT JOIN utilisateurs u ON u.id = l.user_id
      ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset],
  )
  res.json({ logs: rows, page, limit })
})

module.exports = { lister, detail, creer, modifier, activer, supprimer, journal }

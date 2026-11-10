// Signalements : déclaration par les citoyens, validation par les agents
const fs = require('fs')
const path = require('path')
const config = require('../config/env')
const db = require('../config/db')
const { Signalement, User, journaliser } = require('../models')
const { urlPhoto } = require('../middleware/upload')
const { ErreurApi, asyncHandler, pagination, POINTS_ECO } = require('../utils/helpers')
const { latitudeValide, longitudeValide } = require('../utils/geoUtils')

const URGENCES = ['faible', 'moyen', 'eleve', 'critique']
const STATUTS = ['en_attente', 'valide', 'en_cours', 'collecte', 'rejete']
const estPersonnel = (role) => role === 'agent_municipal' || role === 'administrateur'

function filtre(valeur, autorisees, nom) {
  if (valeur === undefined || valeur === '') return undefined
  if (!autorisees.includes(valeur)) throw new ErreurApi(400, `Valeur de ${nom} inconnue`, 'FILTRE_INVALIDE')
  return valeur
}

function supprimerPhoto(url) {
  if (!url?.startsWith('/uploads/')) return
  fs.promises.unlink(path.join(config.upload.dossier, path.basename(url))).catch(() => {})
}

const lister = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query)
  const resultat = await Signalement.lister({
    statut: filtre(req.query.statut, STATUTS, 'statut'),
    urgence: filtre(req.query.urgence, URGENCES, 'urgence'),
    zone_id: req.query.zone_id || undefined,
    // un citoyen ne voit en liste que ses propres signalements
    citoyen_id: req.user.role === 'citoyen' ? req.user.id : undefined,
    limit,
    offset,
  })
  res.json({ ...resultat, page, limit })
})

// Carte : tous les signalements non rejetés ; le nom du déclarant n'est montré qu'au personnel
const carte = asyncHandler(async (req, res) => {
  const points = await Signalement.carte({
    statut: filtre(req.query.statut, STATUTS, 'statut'),
    urgence: filtre(req.query.urgence, URGENCES, 'urgence'),
  })
  res.json({ signalements: estPersonnel(req.user.role) ? points : points.map(({ citoyen_nom, ...p }) => p) })
})

const mes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query)
  const resultat = await Signalement.lister({ citoyen_id: req.user.id, statut: filtre(req.query.statut, STATUTS, 'statut'), limit, offset })
  res.json({ ...resultat, page, limit })
})

const detail = asyncHandler(async (req, res) => {
  const s = await Signalement.parId(req.params.id)
  if (!s) throw new ErreurApi(404, 'Signalement introuvable', 'SIGNALEMENT_INTROUVABLE')
  if (req.user.role === 'citoyen' && s.citoyen_id !== req.user.id) throw new ErreurApi(403, 'Ce signalement ne vous appartient pas', 'ACCES_REFUSE')
  res.json(s)
})

const creer = asyncHandler(async (req, res) => {
  const latitude = Number(req.body.latitude)
  const longitude = Number(req.body.longitude)
  const urgence = req.body.urgence || 'moyen'
  try {
    if (!latitudeValide(latitude) || !longitudeValide(longitude)) throw new ErreurApi(400, 'Position GPS invalide', 'GPS_INVALIDE')
    if (!URGENCES.includes(urgence)) throw new ErreurApi(400, "Niveau d'urgence inconnu", 'URGENCE_INVALIDE')
    const description = req.body.description?.trim().slice(0, 2000) || null
    if (!req.file && !description) throw new ErreurApi(400, 'Ajoutez une photo ou une description', 'CONTENU_REQUIS')

    const id = await db.transaction(async (tx) => {
      const nouvel = await Signalement.creer(
        { citoyen_id: req.user.id, latitude, longitude, description, adresse: req.body.adresse?.trim().slice(0, 255), urgence, photo_url: req.file ? urlPhoto(req.file) : null },
        tx,
      )
      await User.ajouterPointsEco(req.user.id, POINTS_ECO.soumis, tx)
      return nouvel
    })
    await journaliser(req, 'creation', 'signalement', id, { urgence })
    res.status(201).json({ ...(await Signalement.parId(id)), points_gagnes: POINTS_ECO.soumis })
  } catch (erreur) {
    if (req.file) supprimerPhoto(urlPhoto(req.file)) // pas de photo orpheline si l'enregistrement échoue
    throw erreur
  }
})

// Validation ou rejet par un agent. Les statuts en_cours / collecte sont gérés par les collectes.
const TRANSITIONS = { en_attente: ['valide', 'rejete'], valide: ['rejete', 'en_attente'], rejete: ['en_attente', 'valide'] }

const changerStatut = asyncHandler(async (req, res) => {
  const { statut } = req.body
  const actuel = await Signalement.parId(req.params.id)
  if (!actuel) throw new ErreurApi(404, 'Signalement introuvable', 'SIGNALEMENT_INTROUVABLE')
  if (!TRANSITIONS[actuel.statut]?.includes(statut)) {
    throw new ErreurApi(422, `Passage de « ${actuel.statut} » à « ${statut} » impossible`, 'TRANSITION_INVALIDE')
  }
  await db.transaction(async (tx) => {
    await Signalement.changerStatut(actuel.id, statut, req.user.id, tx)
    // les points de validation ne sont attribués qu'une fois par signalement
    if (statut === 'valide' && !actuel.date_validation) await User.ajouterPointsEco(actuel.citoyen_id, POINTS_ECO.valide, tx)
  })
  await journaliser(req, 'changement_statut', 'signalement', actuel.id, { de: actuel.statut, vers: statut })
  res.json(await Signalement.parId(actuel.id))
})

// Suppression : l'administrateur, ou le citoyen auteur tant que son signalement est en attente
const supprimer = asyncHandler(async (req, res) => {
  const s = await Signalement.parId(req.params.id)
  if (!s) throw new ErreurApi(404, 'Signalement introuvable', 'SIGNALEMENT_INTROUVABLE')
  const auteur = req.user.role === 'citoyen' && s.citoyen_id === req.user.id && s.statut === 'en_attente'
  if (req.user.role !== 'administrateur' && !auteur) throw new ErreurApi(403, 'Suppression non autorisée', 'ACCES_REFUSE')
  if (['en_cours'].includes(s.statut)) throw new ErreurApi(422, 'Signalement inclus dans une tournée en cours', 'SIGNALEMENT_EN_TOURNEE')
  await Signalement.supprimer(s.id)
  supprimerPhoto(s.photo_url)
  await journaliser(req, 'suppression', 'signalement', s.id)
  res.json({ message: 'Signalement supprimé' })
})

module.exports = { lister, carte, mes, detail, creer, changerStatut, supprimer, URGENCES, STATUTS }

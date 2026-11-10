// Authentification : inscription (citoyens), connexion, jetons d'accès et de renouvellement
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const config = require('../config/env')
const db = require('../config/db')
const { User, journaliser } = require('../models')
const { ErreurApi, asyncHandler } = require('../utils/helpers')

const TOURS_BCRYPT = 12
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const empreinte = (jeton) => crypto.createHash('sha256').update(jeton).digest('hex')

function verifierMotDePasse(mdp) {
  if (typeof mdp !== 'string' || mdp.length < 8 || !/\d/.test(mdp) || !/[A-Za-z]/.test(mdp)) {
    throw new ErreurApi(400, 'Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre', 'MOT_DE_PASSE_FAIBLE')
  }
}

const publicUser = (u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role, telephone: u.telephone ?? null })

// Jeton d'accès court (15 min) + jeton de renouvellement (7 j) dont seule l'empreinte est stockée
async function emettreJetons(user) {
  const token = jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
  const refreshToken = jwt.sign({ id: user.id, jti: crypto.randomUUID() }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpires })
  const { exp } = jwt.decode(refreshToken)
  await db.query('INSERT INTO refresh_tokens (user_id, token, expire_at) VALUES ($1, $2, to_timestamp($3))', [user.id, empreinte(refreshToken), exp])
  return { token, refreshToken }
}

// Inscription publique : uniquement des citoyens. Agents et chauffeurs sont créés par un administrateur.
const register = asyncHandler(async (req, res) => {
  const { nom, prenom, email, mot_de_passe, telephone, extras = {} } = req.body
  if (req.body.role && req.body.role !== 'citoyen') {
    throw new ErreurApi(403, 'Les comptes du personnel sont créés par un administrateur', 'ROLE_NON_AUTORISE')
  }
  if (!EMAIL.test(email ?? '')) throw new ErreurApi(400, 'Adresse e-mail invalide', 'EMAIL_INVALIDE')
  verifierMotDePasse(mot_de_passe)
  if (await User.parEmail(email)) throw new ErreurApi(409, 'Cette adresse e-mail est déjà utilisée', 'EMAIL_EXISTANT')

  const user = await User.creer({
    nom,
    prenom,
    email,
    telephone,
    role: 'citoyen',
    motDePasseHash: await bcrypt.hash(mot_de_passe, TOURS_BCRYPT),
    extras: { quartier: extras.quartier ?? req.body.quartier },
  })
  req.user = user
  await journaliser(req, 'inscription', 'utilisateur', user.id)
  res.status(201).json({ ...(await emettreJetons(user)), user: publicUser(user) })
})

const login = asyncHandler(async (req, res) => {
  const { email, mot_de_passe } = req.body
  const user = await User.parEmail(email)
  // même message que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites
  if (!user || !(await bcrypt.compare(String(mot_de_passe), user.mot_de_passe))) {
    throw new ErreurApi(401, 'E-mail ou mot de passe incorrect', 'IDENTIFIANTS_INVALIDES')
  }
  if (!user.actif) throw new ErreurApi(403, 'Ce compte a été désactivé', 'COMPTE_INACTIF')
  req.user = user
  await journaliser(req, 'connexion', 'utilisateur', user.id)
  res.json({ ...(await emettreJetons(user)), user: publicUser(user) })
})

// Renouvellement avec rotation : l'ancien jeton est supprimé, un nouveau est émis
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body
  let charge
  try {
    charge = jwt.verify(refreshToken, config.jwt.refreshSecret)
  } catch {
    throw new ErreurApi(401, 'Session expirée, reconnectez-vous', 'REFRESH_INVALIDE')
  }
  const { rows } = await db.query('DELETE FROM refresh_tokens WHERE token = $1 AND expire_at > NOW() RETURNING user_id', [empreinte(refreshToken)])
  if (!rows[0] || rows[0].user_id !== charge.id) throw new ErreurApi(401, 'Session expirée, reconnectez-vous', 'REFRESH_INVALIDE')
  const user = await User.profil(charge.id)
  if (!user?.actif) throw new ErreurApi(403, 'Ce compte a été désactivé', 'COMPTE_INACTIF')
  res.json(await emettreJetons(user))
})

const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body ?? {}
  if (refreshToken) await db.query('DELETE FROM refresh_tokens WHERE token = $1', [empreinte(refreshToken)])
  else await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id])
  await journaliser(req, 'deconnexion', 'utilisateur', req.user.id)
  res.json({ message: 'Déconnecté avec succès' })
})

const profil = asyncHandler(async (req, res) => {
  res.json(await User.profil(req.user.id))
})

// Changement de mot de passe par l'utilisateur lui-même : toutes ses sessions sont fermées
const changerMotDePasse = asyncHandler(async (req, res) => {
  const { ancien, nouveau } = req.body
  const user = await User.parEmail(req.user.email)
  if (!(await bcrypt.compare(String(ancien), user.mot_de_passe))) throw new ErreurApi(401, 'Mot de passe actuel incorrect', 'IDENTIFIANTS_INVALIDES')
  verifierMotDePasse(nouveau)
  await db.query('UPDATE utilisateurs SET mot_de_passe = $2 WHERE id = $1', [user.id, await bcrypt.hash(nouveau, TOURS_BCRYPT)])
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id])
  await journaliser(req, 'changement_mot_de_passe', 'utilisateur', user.id)
  res.json({ message: 'Mot de passe modifié. Reconnectez-vous sur vos autres appareils.' })
})

module.exports = { register, login, refresh, logout, profil, changerMotDePasse, verifierMotDePasse, TOURS_BCRYPT }

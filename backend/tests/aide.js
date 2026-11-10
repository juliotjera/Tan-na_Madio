// Outils communs aux tests : base PGlite en mémoire (DB_MODE=memoire), données de démonstration, connexion
// photos des tests dans le dossier temporaire du système, pas dans backend/uploads
process.env.UPLOAD_DIR ??= require('path').join(require('os').tmpdir(), 'tanana-madio-tests')

const request = require('supertest')
const { creerApp } = require('../src/config/app')
const db = require('../src/config/db')
const { seed, MOT_DE_PASSE_DEMO } = require('../scripts/seedDb')

const app = creerApp()

async function preparer({ donnees = true } = {}) {
  await db.base()
  if (donnees) await seed({ journal: () => {} })
}

async function connecter(email, mot_de_passe = MOT_DE_PASSE_DEMO) {
  const r = await request(app).post('/api/auth/login').send({ email, mot_de_passe })
  if (r.status !== 200) throw new Error(`connexion ${email} : ${r.status} ${JSON.stringify(r.body)}`)
  return { ...r.body, entete: { Authorization: `Bearer ${r.body.token}` } }
}

// Plus petite image PNG valide (1×1 pixel)
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

module.exports = { app, request, db, preparer, connecter, PNG }

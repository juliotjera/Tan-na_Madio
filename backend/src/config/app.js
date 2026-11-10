// Application Express : sécurité, API, photos, et (en production) le frontend compilé
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const config = require('./env')
const db = require('./db')
const routes = require('../routes')
const { routeIntrouvable, gestionErreurs } = require('../middleware/erreurs')

const FRONTEND = path.join(__dirname, '../../../frontend/dist')
const test = process.env.NODE_ENV === 'test'

function creerApp() {
  const app = express()
  app.set('trust proxy', 1) // derrière l'hébergeur (adresse IP réelle pour la limitation et le journal)
  app.disable('x-powered-by')

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // photos affichées par le frontend de développement (port 5173)
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'blob:', 'https://*.basemaps.cartocdn.com', 'https://*.tile.openstreetmap.org'],
          'connect-src': ["'self'", 'https://nominatim.openstreetmap.org'],
        },
      },
    }),
  )
  app.use(cors({ origin: config.corsOrigins, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  // contre les essais de mots de passe en série : 20 tentatives par quart d'heure et par adresse
  const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => test,
    message: { message: 'Trop de tentatives, réessayez dans quelques minutes', code: 'TROP_DE_TENTATIVES' },
  })
  app.use('/api/auth/login', limiteAuth)
  app.use('/api/auth/register', limiteAuth)
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, skip: () => test, standardHeaders: 'draft-7', legacyHeaders: false }))

  app.get('/api/sante', async (req, res) => {
    const debut = Date.now()
    await db.query('SELECT 1')
    res.json({ statut: 'ok', base: config.db.mode, latence_ms: Date.now() - debut })
  })
  app.use('/api', routes)
  app.use('/api', routeIntrouvable)

  app.use('/uploads', express.static(config.upload.dossier, { maxAge: '7d', index: false }))

  // une seule adresse en production : le frontend React est servi par l'API
  if (fs.existsSync(FRONTEND)) {
    app.use(express.static(FRONTEND, { index: false, maxAge: '1h' }))
    app.get('*', (req, res) => res.sendFile(path.join(FRONTEND, 'index.html')))
  }

  app.use(routeIntrouvable)
  app.use(gestionErreurs)
  return app
}

module.exports = { creerApp }

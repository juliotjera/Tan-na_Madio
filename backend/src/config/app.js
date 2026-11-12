// Application Express : sécurité, API, photos, et (en production) le frontend compilé
const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const { rateLimit } = require('express-rate-limit')
const config = require('./env')
const stockagePhotos = require('../services/stockagePhotos')
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
          'img-src': ["'self'", 'data:', 'blob:', 'https://tile.openstreetmap.org'],
          'connect-src': ["'self'", 'https://nominatim.openstreetmap.org', 'https://tile.openstreetmap.org'], // recherche d'adresse, tuiles gardées hors ligne
        },
      },
    }),
  )
  // réponses compressées : pages et données plus rapides sur réseau mobile (sauf le flux temps réel,
  // qui doit partir sans attendre que le tampon de compression soit plein)
  app.use(compression({ filter: (req, res) => !req.path.endsWith('/notifications/flux') && compression.filter(req, res) }))
  app.use(cors({ origin: config.corsOrigins, credentials: true }))

  // journal des requêtes de l'API (hors tests) : méthode, adresse, statut, durée
  if (!test) {
    app.use('/api', (req, res, next) => {
      const debut = process.hrtime.bigint()
      res.on('finish', () => {
        const ms = Number(process.hrtime.bigint() - debut) / 1e6
        console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)} ms`)
      })
      next()
    })
  }
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

  // photos : lues dans la base (PHOTOS_STOCKAGE=base) ou servies depuis le disque
  if (stockagePhotos.enBase()) {
    app.get('/uploads/:nom', async (req, res, next) => {
      try {
        const photo = await stockagePhotos.lire(req.params.nom)
        if (!photo) return res.status(404).end()
        res.set('Cache-Control', 'public, max-age=604800, immutable').type(photo.type).send(photo.contenu)
      } catch (erreur) {
        next(erreur)
      }
    })
  } else {
    app.use('/uploads', express.static(config.upload.dossier, { maxAge: '7d', index: false }))
  }

  // une seule adresse en production : le frontend React est servi par l'API
  if (fs.existsSync(FRONTEND)) {
    // fichiers versionnés (nom avec empreinte) : cache d'un an ; page et service worker : toujours revérifiés
    app.use('/assets', express.static(path.join(FRONTEND, 'assets'), { immutable: true, maxAge: '1y', index: false }))
    app.use(express.static(FRONTEND, { index: false, maxAge: 0, setHeaders: (res) => res.set('Cache-Control', 'no-cache') }))
    app.get('*', (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(FRONTEND, 'index.html')))
  }

  app.use(routeIntrouvable)
  app.use(gestionErreurs)
  return app
}

module.exports = { creerApp }

// Application Express : sécurité, API, photos, et (en production) le frontend compilé
const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')
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
// Dernière version signée de l'application Android, publiée dans les Releases GitHub
const SOURCE_APK = 'https://github.com/juliotjera/Tan-na_Madio/releases/latest/download/tanana-madio.apk'
const ORIGINES_APPLICATION = ['https://localhost', 'capacitor://localhost']

function creerApp() {
  const app = express()
  app.set('trust proxy', 1) // derrière l'hébergeur (adresse IP réelle pour la limitation et le journal)
  app.disable('x-powered-by')

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // photos affichées par le frontend de développement (port 5173)
      // OpenStreetMap exige l'origine du site (en-tête Referer) pour servir ses tuiles : sans elle, « Access blocked »
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
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
  // le site (CORS_ORIGINS) et l'application Android, dont l'interface est servie par Capacitor
  // depuis https://localhost : elle s'authentifie par jeton (en-tête Authorization), pas par cookie
  app.use(cors({ origin: [...config.corsOrigins, ...ORIGINES_APPLICATION], credentials: true }))

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
  // démonstration : pas de mot de passe à deviner, mais pas de création de sessions en rafale ;
  // compteur séparé pour ne pas gêner les vraies connexions
  app.use('/api/auth/demo', rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false, skip: () => test, message: { message: 'Trop de tentatives, réessayez dans quelques minutes', code: 'TROP_DE_TENTATIVES' } }))
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

  // Application Android : téléchargée depuis le site lui-même, qui la reprend des Releases GitHub.
  // Une seule adresse, sans redirection vers un autre domaine (que le navigateur intégré de
  // WhatsApp ou de Facebook gère mal : téléchargement bloqué). La nouvelle version publiée sur
  // GitHub est servie aussitôt, sans redéployer le site.
  app.get('/telecharger/tanana-madio.apk', async (req, res) => {
    try {
      // délai pour joindre GitHub seulement : le transfert lui-même peut être long (réseau lent)
      const arret = new AbortController()
      const delai = setTimeout(() => arret.abort(), 30000)
      const source = await fetch(SOURCE_APK, { signal: arret.signal }).finally(() => clearTimeout(delai))
      if (!source.ok || !source.body) return res.status(502).json({ message: 'Application Android indisponible pour le moment', code: 'APK_INDISPONIBLE' })
      res.set({
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="tanana-madio.apk"',
        'Cache-Control': 'no-cache',
      })
      const taille = source.headers.get('content-length')
      if (taille) res.set('Content-Length', taille)
      const flux = Readable.fromWeb(source.body)
      flux.on('error', () => res.destroy()) // coupure côté GitHub : le téléphone pourra réessayer
      req.on('close', () => flux.destroy()) // téléchargement annulé par le téléphone
      flux.pipe(res)
    } catch {
      // GitHub injoignable : message clair plutôt qu'une erreur 500
      if (!res.headersSent) res.status(502).json({ message: 'Application Android indisponible pour le moment', code: 'APK_INDISPONIBLE' })
    }
  })

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

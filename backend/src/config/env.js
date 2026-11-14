// Configuration lue depuis les variables d'environnement (fichier .env en développement).
require('dotenv').config({ quiet: true })

const production = process.env.NODE_ENV === 'production'

// En production, les secrets JWT sont obligatoires : jamais de valeur par défaut connue de tous.
function secret(nom, defautDev) {
  const valeur = process.env[nom]
  if (valeur) return valeur
  if (production) throw new Error(`Variable ${nom} manquante (obligatoire en production)`)
  return defautDev
}

// Base de données (DB_MODE) :
// - postgres : vrai serveur PostgreSQL + PostGIS (DATABASE_URL ou DB_HOST…)
// - pglite   : PostgreSQL + PostGIS en WebAssembly, fichiers dans backend/.donnees (développement)
// - memoire  : PGlite vidé à chaque lancement (tests automatiques)
const mode = process.env.DB_MODE || (process.env.DATABASE_URL || process.env.DB_HOST ? 'postgres' : 'pglite')

module.exports = {
  production,
  port: Number(process.env.PORT) || 3000,
  db: {
    mode,
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'tananamadio',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dossierPglite: process.env.PGLITE_DOSSIER || require('path').join(__dirname, '../../.donnees'),
  },
  jwt: {
    secret: secret('JWT_SECRET', 'dev-secret-a-changer'),
    refreshSecret: secret('JWT_REFRESH_SECRET', 'dev-refresh-secret-a-changer'),
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  upload: {
    dossier: process.env.UPLOAD_DIR || require('path').join(__dirname, '../../uploads'),
    maxMo: Number(process.env.UPLOAD_MAX_MB) || 5,
  },
  // Photos : « base » (table photos de PostgreSQL) en production sur un vrai serveur, sinon « disque »
  photos: {
    stockage: process.env.PHOTOS_STOCKAGE || (production && mode === 'postgres' ? 'base' : 'disque'),
  },
  // Comptes de démonstration ouverts en un clic (« Essayer en tant que… ») : actifs sur le site
  // public (COMPTES_DEMO=true) et en développement ; coupés en production réelle et pendant les tests
  comptesDemo: process.env.COMPTES_DEMO ? process.env.COMPTES_DEMO === 'true' : !production && process.env.NODE_ENV !== 'test',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map((o) => o.trim()),
  algorithmes: {
    rayonRechercheM: Number(process.env.RAYON_RECHERCHE_M) || 500,
    capaciteMaxKg: Number(process.env.CAPACITE_MAX_KG) || 5000,
  },
}

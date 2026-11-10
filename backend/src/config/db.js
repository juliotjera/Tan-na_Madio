// Accès à la base, même interface quel que soit le moteur :
// - PostgreSQL + PostGIS (production) : pool de connexions « pg »
// - PGlite + PostGIS (développement, tests) : PostgreSQL compilé en WebAssembly, rien à installer
// Le SQL est identique dans les deux cas (même moteur PostgreSQL 18 + PostGIS 3).
const fs = require('fs')
const path = require('path')
const config = require('./env')

const SCHEMA = path.join(__dirname, 'schema.sql')
const MIGRATIONS = path.join(__dirname, 'migrations.sql')

// Le schéma n'est appliqué qu'une fois (CREATE TYPE ne peut pas être rejoué) ;
// les migrations, idempotentes, le sont à chaque démarrage.
async function appliquerSchemaSiAbsent(executer) {
  const { rows } = await executer(`SELECT to_regclass('public.utilisateurs') AS t`)
  if (!rows[0].t) await executer(fs.readFileSync(SCHEMA, 'utf8'))
  await executer(fs.readFileSync(MIGRATIONS, 'utf8'))
}

async function connecterPglite() {
  const { PGlite } = require('@electric-sql/pglite')
  const { postgis } = require('@electric-sql/pglite-postgis')
  const { uuid_ossp } = require('@electric-sql/pglite/contrib/uuid_ossp')
  const pg = await PGlite.create({
    dataDir: config.db.mode === 'memoire' ? undefined : config.db.dossierPglite,
    extensions: { postgis, uuid_ossp },
  })
  const executer = async (texte, params) => {
    if (!params || params.length === 0) {
      // plusieurs instructions possibles (schéma) : exec, puis dernier résultat
      const resultats = await pg.exec(texte)
      const dernier = resultats.at(-1) ?? { rows: [], affectedRows: 0 }
      return { rows: dernier.rows, rowCount: dernier.affectedRows || dernier.rows.length }
    }
    const r = await pg.query(texte, params)
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length }
  }
  await appliquerSchemaSiAbsent(executer)
  return {
    query: executer,
    // transaction : toutes les requêtes réussissent, ou aucune
    async transaction(fn) {
      return pg.transaction(async (tx) =>
        fn({
          query: async (texte, params) => {
            const r = await tx.query(texte, params)
            return { rows: r.rows, rowCount: r.affectedRows || r.rows.length }
          },
        }),
      )
    },
    fermer: () => pg.close(),
  }
}

async function connecterPostgres() {
  const { Pool } = require('pg')
  const pool = new Pool(
    config.db.url
      ? { connectionString: config.db.url, ssl: config.db.url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined }
      : { host: config.db.host, port: config.db.port, database: config.db.database, user: config.db.user, password: config.db.password },
  )
  const executer = (texte, params) => pool.query(texte, params)
  await executer('CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  await appliquerSchemaSiAbsent(executer)
  return {
    query: executer,
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const resultat = await fn({ query: (t, p) => client.query(t, p) })
        await client.query('COMMIT')
        return resultat
      } catch (erreur) {
        await client.query('ROLLBACK')
        throw erreur
      } finally {
        client.release()
      }
    },
    fermer: () => pool.end(),
  }
}

// Connexion ouverte une seule fois, au premier besoin ; en cas d'échec, nouvel essai ensuite
let connexion
function base() {
  connexion ??= (config.db.mode === 'postgres' ? connecterPostgres() : connecterPglite()).catch((erreur) => {
    connexion = undefined
    throw erreur
  })
  return connexion
}

// Requête paramétrée ($1, $2…) : les valeurs ne sont jamais concaténées au SQL (pas d'injection SQL)
const query = async (texte, params) => (await base()).query(texte, params)
const transaction = async (fn) => (await base()).transaction(fn)

async function fermer() {
  if (connexion) await (await connexion).fermer()
  connexion = undefined
}

module.exports = { query, transaction, fermer, base }

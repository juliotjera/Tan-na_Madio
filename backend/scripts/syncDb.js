// Vérifie la connexion et crée le schéma s'il n'existe pas encore (sans rien effacer).
//   npm run db:sync
const config = require('../src/config/env')
const db = require('../src/config/db')

db.base()
  .then(async () => {
    const { rows } = await db.query(
      `SELECT count(*)::int AS tables, (SELECT extversion FROM pg_extension WHERE extname = 'postgis') AS postgis
         FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    )
    console.log(`Base ${config.db.mode} prête : ${rows[0].tables} tables, PostGIS ${rows[0].postgis}`)
  })
  .catch((erreur) => {
    console.error('Connexion impossible :', erreur.message)
    process.exitCode = 1
  })
  .finally(() => db.fermer())

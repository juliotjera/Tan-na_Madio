// Démarrage du serveur HTTP (base ouverte d'abord : le schéma est créé au premier lancement)
const config = require('./config/env')
const db = require('./config/db')
const { creerApp } = require('./config/app')

async function demarrer() {
  const debut = Date.now()
  await db.base()
  // site de démonstration : base vide remplie automatiquement (SEED_DEMO=true)
  if (process.env.SEED_DEMO === 'true') {
    const { rows } = await db.query('SELECT count(*)::int AS n FROM utilisateurs')
    if (rows[0].n === 0) {
      await require('../scripts/seedDb').seed()
      console.log('Données de démonstration chargées')
    }
  }
  const serveur = creerApp().listen(config.port, () => {
    console.log(`Tanàna Madio — API prête sur http://localhost:${config.port}/api (base ${config.db.mode}, ${Date.now() - debut} ms)`)
  })

  const arreter = async () => {
    serveur.close()
    await db.fermer()
    process.exit(0)
  }
  process.on('SIGINT', arreter)
  process.on('SIGTERM', arreter)
}

demarrer().catch((erreur) => {
  console.error('Démarrage impossible :', erreur.message)
  process.exit(1)
})

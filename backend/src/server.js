// Démarrage du serveur HTTP (base ouverte d'abord : le schéma est créé au premier lancement)
const config = require('./config/env')
const db = require('./config/db')
const { creerApp } = require('./config/app')

async function demarrer() {
  const debut = Date.now()
  await db.base()
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

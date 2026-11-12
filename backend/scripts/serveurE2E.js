// Serveur des tests de bout en bout (Playwright) : base PGlite en mémoire remplie avec les
// données de démonstration, API et interface compilée (frontend/dist) sur un seul port.
process.env.DB_MODE = 'memoire'
process.env.UPLOAD_DIR ??= require('path').join(require('os').tmpdir(), 'tanana-madio-e2e')

const db = require('../src/config/db')
const { creerApp } = require('../src/config/app')
const { seed } = require('./seedDb')

const PORT = Number(process.env.PORT) || 4173

async function demarrer() {
  await db.base()
  await seed({ journal: () => {} })
  creerApp().listen(PORT, () => console.log(`Serveur de test prêt sur http://localhost:${PORT}`))
}

demarrer().catch((erreur) => {
  console.error(erreur)
  process.exit(1)
})

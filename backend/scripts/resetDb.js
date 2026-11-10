// Remise à zéro : supprime toutes les tables, recrée le schéma, puis recharge les données de démonstration.
//   npm run db:reset
// Refusé en production (sauf --force explicite) : l'opération efface tout.
const config = require('../src/config/env')
const db = require('../src/config/db')
const { seed } = require('./seedDb')

async function reset() {
  if (config.production && !process.argv.includes('--force')) throw new Error('Remise à zéro refusée en production (ajoutez --force si vous en êtes sûr)')
  await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public')
  await db.fermer() // la reconnexion réapplique le schéma complet (extensions comprises)
  await db.base()
  console.log('Schéma recréé')
  if (!process.argv.includes('--vide')) await seed()
}

reset()
  .then(() => console.log('Base prête'))
  .catch((erreur) => {
    console.error(erreur.message)
    process.exitCode = 1
  })
  .finally(() => db.fermer())

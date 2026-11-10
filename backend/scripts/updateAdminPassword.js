// Changement du mot de passe d'un compte (par exemple l'administrateur par défaut), sessions fermées.
//   ADMIN_EMAIL=... ADMIN_MOT_DE_PASSE=... npm run admin:password
const bcrypt = require('bcryptjs')
const db = require('../src/config/db')
const { User } = require('../src/models')
const { verifierMotDePasse, TOURS_BCRYPT } = require('../src/controllers/authController')

async function changer() {
  const email = process.env.ADMIN_EMAIL || 'admin@tananamadio.mg'
  const mdp = process.env.ADMIN_MOT_DE_PASSE
  if (!mdp) throw new Error('Renseignez ADMIN_MOT_DE_PASSE')
  verifierMotDePasse(mdp)
  const u = await User.parEmail(email)
  if (!u) throw new Error(`Aucun compte ${email}`)
  await db.query('UPDATE utilisateurs SET mot_de_passe = $2 WHERE id = $1', [u.id, await bcrypt.hash(mdp, TOURS_BCRYPT)])
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [u.id])
  console.log(`Mot de passe de ${email} modifié, sessions fermées`)
}

changer()
  .catch((erreur) => {
    console.error(erreur.message)
    process.exitCode = 1
  })
  .finally(() => db.fermer())

// Création d'un administrateur sur une base de production (sans données de démonstration).
//   ADMIN_EMAIL=... ADMIN_MOT_DE_PASSE=... npm run admin:create
// Le mot de passe est lu dans l'environnement pour ne pas rester dans l'historique du terminal.
const bcrypt = require('bcryptjs')
const db = require('../src/config/db')
const { User } = require('../src/models')
const { verifierMotDePasse, TOURS_BCRYPT } = require('../src/controllers/authController')

async function creer() {
  const email = process.env.ADMIN_EMAIL
  const mdp = process.env.ADMIN_MOT_DE_PASSE
  if (!email || !mdp) throw new Error('Renseignez ADMIN_EMAIL et ADMIN_MOT_DE_PASSE')
  verifierMotDePasse(mdp)
  if (await User.parEmail(email)) throw new Error(`Le compte ${email} existe déjà`)
  const u = await User.creer({
    nom: process.env.ADMIN_NOM || 'Admin',
    prenom: process.env.ADMIN_PRENOM || 'Système',
    email,
    role: 'administrateur',
    motDePasseHash: await bcrypt.hash(mdp, TOURS_BCRYPT),
    extras: { niveau: 3 },
  })
  console.log(`Administrateur créé : ${u.email}`)
}

creer()
  .catch((erreur) => {
    console.error(erreur.message)
    process.exitCode = 1
  })
  .finally(() => db.fermer())

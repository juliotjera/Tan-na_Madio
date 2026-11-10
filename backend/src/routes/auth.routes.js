const router = require('express').Router()
const c = require('../controllers/authController')
const { authentifier } = require('../middleware/auth')
const { requis } = require('../middleware/validate')

router.post('/register', requis('nom', 'prenom', 'email', 'mot_de_passe'), c.register)
router.post('/login', requis('email', 'mot_de_passe'), c.login)
router.post('/refresh', requis('refreshToken'), c.refresh)
router.post('/logout', authentifier, c.logout)
router.get('/profil', authentifier, c.profil)
router.patch('/mot-de-passe', authentifier, requis('ancien', 'nouveau'), c.changerMotDePasse)

module.exports = router

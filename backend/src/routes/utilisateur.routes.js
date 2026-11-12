const router = require('express').Router()
const c = require('../controllers/utilisateurController')
const { authentifier } = require('../middleware/auth')
const { autoriser, uuidParam, requis } = require('../middleware/validate')

router.use(authentifier)
router.put('/:id', uuidParam('id'), c.modifier) // admin, ou l'utilisateur pour son propre profil
router.use(autoriser('administrateur'))
router.get('/', c.lister)
router.get('/journal', c.journal)
router.post('/', requis('nom', 'prenom', 'email', 'mot_de_passe', 'role'), c.creer)
router.get('/:id', uuidParam('id'), c.detail)
router.patch('/:id/activer', uuidParam('id'), c.activer)
router.post('/:id/mot-de-passe', uuidParam('id'), c.reinitialiserMotDePasse)
router.delete('/:id', uuidParam('id'), c.supprimer)

module.exports = router

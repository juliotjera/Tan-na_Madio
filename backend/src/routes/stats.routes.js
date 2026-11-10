const router = require('express').Router()
const c = require('../controllers/statsController')
const { authentifier } = require('../middleware/auth')
const { autoriser } = require('../middleware/validate')

router.get('/public', c.apercu) // page d'accueil, sans connexion
router.get('/top-citoyens', authentifier, c.topCitoyens) // classement visible par tous les connectés
router.use(authentifier, autoriser('agent_municipal', 'administrateur'))
router.get('/dashboard', c.dashboard)
router.get('/zones', c.zones)
router.get('/camions', c.camions)
router.get('/periode', autoriser('administrateur'), c.periode)

module.exports = router

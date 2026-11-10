const router = require('express').Router()
const c = require('../controllers/statsController')
const { authentifier } = require('../middleware/auth')
const { autoriser } = require('../middleware/validate')

router.use(authentifier, autoriser('agent_municipal', 'administrateur'))
router.get('/dashboard', c.dashboard)
router.get('/zones', c.zones)
router.get('/periode', autoriser('administrateur'), c.periode)

module.exports = router

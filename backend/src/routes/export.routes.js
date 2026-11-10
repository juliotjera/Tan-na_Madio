const router = require('express').Router()
const c = require('../controllers/exportController')
const { authentifier } = require('../middleware/auth')
const { autoriser } = require('../middleware/validate')

router.use(authentifier, autoriser('agent_municipal', 'administrateur'))
router.get('/signalements.csv', c.signalements)
router.get('/collectes.csv', c.collectes)

module.exports = router

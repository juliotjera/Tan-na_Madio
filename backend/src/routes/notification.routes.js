const router = require('express').Router()
const c = require('../controllers/notificationController')
const { authentifier } = require('../middleware/auth')
const { uuidParam } = require('../middleware/validate')

router.use(authentifier)
router.get('/', c.lister)
router.get('/flux', c.flux)
router.patch('/tout-lu', c.toutLire)
router.patch('/:id/lu', uuidParam('id'), c.lire)

module.exports = router

const router = require('express').Router()
const c = require('../controllers/zoneController')
const { authentifier } = require('../middleware/auth')
const { autoriser, uuidParam } = require('../middleware/validate')

router.use(authentifier)
router.get('/', c.lister)
router.get('/:id', uuidParam('id'), c.detail)
router.post('/', autoriser('administrateur'), c.creer)
router.put('/:id', autoriser('administrateur'), uuidParam('id'), c.modifier)
router.delete('/:id', autoriser('administrateur'), uuidParam('id'), c.supprimer)

module.exports = router

const router = require('express').Router()
const c = require('../controllers/signalementController')
const { authentifier } = require('../middleware/auth')
const { autoriser, uuidParam, requis } = require('../middleware/validate')
const { uploadPhoto } = require('../middleware/upload')

router.use(authentifier)
router.get('/', c.lister)
router.get('/carte', c.carte)
router.get('/mes', autoriser('citoyen'), c.mes)
router.get('/:id', uuidParam('id'), c.detail)
router.post('/', autoriser('citoyen'), uploadPhoto, c.creer)
router.patch('/:id/statut', autoriser('agent_municipal', 'administrateur'), uuidParam('id'), requis('statut'), c.changerStatut)
router.delete('/:id', autoriser('citoyen', 'administrateur'), uuidParam('id'), c.supprimer)

module.exports = router

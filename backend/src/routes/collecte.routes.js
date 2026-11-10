const router = require('express').Router()
const c = require('../controllers/collecteController')
const { authentifier } = require('../middleware/auth')
const { autoriser, uuidParam, requis } = require('../middleware/validate')

const AGENTS = ['agent_municipal', 'administrateur']

router.use(authentifier)
router.get('/', autoriser(...AGENTS, 'chauffeur'), c.lister)
router.post('/optimiser', autoriser(...AGENTS), requis('signalement_ids'), c.optimiser)
router.post('/repartition', autoriser(...AGENTS), requis('signalement_ids'), c.repartition)
router.post('/suggestion', autoriser(...AGENTS), requis('camion_id'), c.suggestion)
router.post('/', autoriser(...AGENTS), requis('camion_id', 'date_planifiee', 'signalement_ids'), c.creer)
router.get('/:id', autoriser(...AGENTS, 'chauffeur'), uuidParam('id'), c.detail)
router.patch('/:id/demarrer', autoriser('chauffeur', 'administrateur'), uuidParam('id'), c.demarrer)
router.patch('/:id/signalements/:sid', autoriser('chauffeur', 'administrateur'), uuidParam('id', 'sid'), c.marquerPoint)
router.patch('/:id/terminer', autoriser('chauffeur', 'administrateur'), uuidParam('id'), c.terminer)
router.patch('/:id/annuler', autoriser(...AGENTS), uuidParam('id'), c.annuler)

module.exports = router

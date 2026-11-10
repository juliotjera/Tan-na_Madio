// Toutes les routes de l'API, sous /api
const router = require('express').Router()

router.use('/auth', require('./auth.routes'))
router.use('/signalements', require('./signalement.routes'))
router.use('/collectes', require('./collecte.routes'))
router.use('/camions', require('./camion.routes'))
router.use('/zones', require('./zone.routes'))
router.use('/stats', require('./stats.routes'))
router.use('/utilisateurs', require('./utilisateur.routes'))
router.use('/notifications', require('./notification.routes'))
router.use('/exports', require('./export.routes'))

module.exports = router

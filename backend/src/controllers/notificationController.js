// Notifications de l'utilisateur connecté
const { Notification } = require('../models')
const { ErreurApi, asyncHandler } = require('../utils/helpers')

const lister = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20))
  res.json(await Notification.lister(req.user.id, { limit, nonLues: req.query.non_lues === 'true' }))
})

const lire = asyncHandler(async (req, res) => {
  if (!(await Notification.marquerLue(req.user.id, req.params.id))) throw new ErreurApi(404, 'Notification introuvable', 'NOTIFICATION_INTROUVABLE')
  res.json({ message: 'Notification lue' })
})

const toutLire = asyncHandler(async (req, res) => {
  res.json({ lues: await Notification.toutMarquerLu(req.user.id) })
})

module.exports = { lister, lire, toutLire }

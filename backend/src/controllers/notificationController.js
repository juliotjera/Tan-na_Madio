// Notifications de l'utilisateur connecté
const { Notification } = require('../models')
const { ErreurApi, asyncHandler } = require('../utils/helpers')
const { bus, canal } = require('../utils/evenements')

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

// Flux en temps réel (Server-Sent Events) : chaque nouvelle notification est envoyée dès sa création.
// Un commentaire « ping » toutes les 25 s garde la connexion ouverte derrière les proxys.
const flux = (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 5000\n\n')
  const envoyer = (n) => res.write(`event: notification\ndata: ${JSON.stringify(n)}\n\n`)
  const ping = setInterval(() => res.write(': ping\n\n'), 25000)
  bus.on(canal(req.user.id), envoyer)
  req.on('close', () => {
    clearInterval(ping)
    bus.off(canal(req.user.id), envoyer)
  })
}

module.exports = { lister, lire, toutLire, flux }

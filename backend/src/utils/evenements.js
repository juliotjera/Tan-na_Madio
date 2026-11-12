// Canal d'événements interne : une notification enregistrée est poussée tout de suite
// aux onglets ouverts de son destinataire (flux SSE), sans attendre le prochain rafraîchissement
const { EventEmitter } = require('events')

const bus = new EventEmitter()
bus.setMaxListeners(0) // un écouteur par onglet connecté

const canal = (userId) => `notification:${userId}`

module.exports = { bus, canal }

// Erreur métier avec son code HTTP : renvoyée telle quelle au client par le gestionnaire d'erreurs
class ErreurApi extends Error {
  constructor(statut, message, code) {
    super(message)
    this.statut = statut
    this.code = code
  }
}

// Enveloppe une fonction async de contrôleur : toute erreur part au gestionnaire d'erreurs
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

// Pagination : page à partir de 1, limite entre 1 et 100
function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  return { page, limit, offset: (page - 1) * limit }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const estUuid = (v) => typeof v === 'string' && UUID.test(v)

// Points écologiques attribués au citoyen à chaque étape de son signalement
const POINTS_ECO = { soumis: 2, valide: 5, collecte: 10 }

// Date lisible à l'heure d'Antananarivo, pour les messages (« mercredi 11 novembre à 07:30 »)
const dateLocale = (d) =>
  new Date(d).toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

module.exports = { dateLocale, ErreurApi, asyncHandler, pagination, estUuid, POINTS_ECO }

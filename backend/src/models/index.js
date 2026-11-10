// Point d'accès unique aux modèles, et journal d'activité (table logs_activite)
const db = require('../config/db')

// Traçabilité : qui a fait quoi, sur quoi, depuis quelle adresse. Ne bloque jamais l'action.
async function journaliser(req, action, entite, entiteId, details) {
  try {
    await db.query(
      'INSERT INTO logs_activite (user_id, action, entite, entite_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.user?.id ?? null, action, entite, entiteId ?? null, details ? JSON.stringify(details) : null, (req.ip || '').replace(/^::ffff:/, '') || null],
    )
  } catch (erreur) {
    console.warn('journal d\'activité :', erreur.message)
  }
}

module.exports = {
  User: require('./User'),
  Signalement: require('./Signalement'),
  Collecte: require('./Collecte'),
  Camion: require('./Camion'),
  Zone: require('./Zone'),
  Notification: require('./Notification'),
  journaliser,
}

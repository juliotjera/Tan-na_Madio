// Notifications dans l'application (cloche de l'en-tête)
const db = require('../config/db')

// Envoi à un ou plusieurs utilisateurs. Comme le journal, ne bloque jamais l'action qui la déclenche.
async function notifier(destinataires, { type, titre, message = null, lien = null }) {
  const ids = [...new Set([destinataires].flat().filter(Boolean))]
  if (!ids.length) return
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, titre, message, lien)
       SELECT unnest($1::uuid[]), $2, $3, $4, $5`,
      [ids, type, titre, message, lien],
    )
  } catch (erreur) {
    console.warn('notification :', erreur.message)
  }
}

// Tous les comptes actifs d'un ou plusieurs rôles (ex. : agents pour une urgence critique)
async function idsParRole(...roles) {
  const { rows } = await db.query('SELECT id FROM utilisateurs WHERE role::text = ANY($1::text[]) AND actif', [roles])
  return rows.map((r) => r.id)
}

async function lister(userId, { limit = 20, nonLues = false } = {}) {
  const { rows } = await db.query(
    `SELECT id, type, titre, message, lien, lu, created_at FROM notifications
      WHERE user_id = $1 ${nonLues ? 'AND NOT lu' : ''} ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  )
  const compte = await db.query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT lu', [userId])
  return { notifications: rows, non_lues: compte.rows[0].n }
}

const marquerLue = async (userId, id) =>
  (await db.query('UPDATE notifications SET lu = TRUE WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).rows[0] ?? null

const toutMarquerLu = async (userId) => (await db.query('UPDATE notifications SET lu = TRUE WHERE user_id = $1 AND NOT lu', [userId])).rowCount

module.exports = { notifier, idsParRole, lister, marquerLue, toutMarquerLu }

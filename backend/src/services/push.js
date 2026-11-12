// Notifications push (Web Push) : une notification apparaît sur le téléphone même application fermée.
// Les clés VAPID viennent de VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, ou sont générées au premier
// démarrage et gardées dans la table « parametres » (rien à configurer pour la démonstration).
const webpush = require('web-push')
const db = require('../config/db')

let cles = null

async function clesVapid() {
  if (cles) return cles
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    cles = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  } else {
    const { rows } = await db.query(`SELECT valeur FROM parametres WHERE cle = 'vapid'`)
    if (rows[0]) cles = JSON.parse(rows[0].valeur)
    else {
      const nouvelles = webpush.generateVAPIDKeys()
      await db.query(`INSERT INTO parametres (cle, valeur) VALUES ('vapid', $1) ON CONFLICT (cle) DO NOTHING`, [JSON.stringify(nouvelles)])
      cles = JSON.parse((await db.query(`SELECT valeur FROM parametres WHERE cle = 'vapid'`)).rows[0].valeur)
    }
  }
  webpush.setVapidDetails(process.env.VAPID_SUJET || 'mailto:contact@tananamadio.mg', cles.publicKey, cles.privateKey)
  return cles
}

async function abonner(userId, { endpoint, keys }) {
  await db.query(
    `INSERT INTO abonnements_push (endpoint, user_id, p256dh, auth) VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [endpoint, userId, keys.p256dh, keys.auth],
  )
}

const desabonner = (userId, endpoint) => db.query('DELETE FROM abonnements_push WHERE endpoint = $1 AND user_id = $2', [endpoint, userId])

// Envoi à tous les appareils des destinataires ; un abonnement expiré (404/410) est retiré.
// Ne bloque jamais l'action qui a déclenché la notification.
async function envoyer(userIds, { titre, message, lien }) {
  if (process.env.NODE_ENV === 'test' || !userIds.length) return
  try {
    const { rows } = await db.query('SELECT endpoint, p256dh, auth FROM abonnements_push WHERE user_id = ANY($1::uuid[])', [userIds])
    if (!rows.length) return
    await clesVapid()
    const contenu = JSON.stringify({ titre, message, lien })
    await Promise.all(
      rows.map((a) =>
        webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, contenu, { TTL: 86400 }).catch((e) => {
          if (e.statusCode === 404 || e.statusCode === 410) return db.query('DELETE FROM abonnements_push WHERE endpoint = $1', [a.endpoint])
          console.warn('push :', e.statusCode ?? e.message)
        }),
      ),
    )
  } catch (erreur) {
    console.warn('push :', erreur.message)
  }
}

module.exports = { clesVapid, abonner, desabonner, envoyer }

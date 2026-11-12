// Notifications push sur cet appareil (téléphone ou ordinateur), via le service worker
import { abonnerPush, clePush, desabonnerPush } from '../api'

export const pushCompatible = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// clé publique VAPID (base64url) → tableau d'octets attendu par le navigateur
function octets(base64) {
  const complete = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(complete), (c) => c.charCodeAt(0))
}

async function enregistrement() {
  // le service worker n'est installé que sur la version compilée : délai court pour ne pas attendre indéfiniment
  return Promise.race([navigator.serviceWorker.ready, new Promise((_, rejeter) => setTimeout(() => rejeter(new Error('Service worker absent')), 4000))])
}

// « non-supporte » | « refuse » | « actif » | « inactif »
export async function etatPush() {
  if (!pushCompatible()) return 'non-supporte'
  if (Notification.permission === 'denied') return 'refuse'
  try {
    const reg = await enregistrement()
    return (await reg.pushManager.getSubscription()) ? 'actif' : 'inactif'
  } catch {
    return 'non-supporte'
  }
}

export async function activerPush() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Autorisation refusée : changez-la dans les réglages du navigateur')
  const reg = await enregistrement()
  const abonnement = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: octets(await clePush()) }))
  await abonnerPush(abonnement.toJSON())
}

export async function desactiverPush() {
  const reg = await enregistrement()
  const abonnement = await reg.pushManager.getSubscription()
  if (!abonnement) return
  await desabonnerPush(abonnement.endpoint).catch(() => {})
  await abonnement.unsubscribe()
}

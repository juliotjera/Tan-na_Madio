// Service worker de Tanàna Madio : l'application s'ouvre même avec un réseau faible ou absent.
// - fichiers compilés (/assets, nom avec empreinte) : cache d'abord ;
// - pages : réseau d'abord, page en cache si le réseau ne répond pas ;
// - photos des signalements : cache d'abord, complété au fil de l'usage (taille limitée) ;
// - tuiles de carte déjà affichées : gardées (le chauffeur retrouve le plan de sa tournée sans réseau) ;
// - API : jamais mise en cache (données toujours fraîches et propres à chaque compte) ;
// - notifications push : affichage et ouverture de la page concernée.
const VERSION = 'tm-v4'
const COQUILLE = `${VERSION}-coquille`
const MEDIAS = `${VERSION}-medias`
const TUILES = 'tm-tuiles' // conservé d'une version à l'autre
const MAX_MEDIAS = 300
const MAX_TUILES = 1500 // environ 25 Mo

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(COQUILLE)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/logo/symbole.svg', '/logo/logo-horizontal-sans-slogan.svg']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION) && c !== TUILES).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  )
})

async function limiter(nom, max) {
  const cache = await caches.open(nom)
  const cles = await cache.keys()
  await Promise.all(cles.slice(0, Math.max(0, cles.length - max)).map((k) => cache.delete(k)))
}

async function cacheDabord(requete, nom) {
  const enCache = await caches.match(requete)
  if (enCache) return enCache
  const reponse = await fetch(requete)
  if (reponse.ok) {
    const cache = await caches.open(nom)
    cache.put(requete, reponse.clone())
    if (nom === MEDIAS) limiter(MEDIAS, MAX_MEDIAS)
    if (nom === TUILES) limiter(TUILES, MAX_TUILES)
  }
  return reponse
}

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === location.origin && url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then((r) => {
          caches.open(COQUILLE).then((c) => c.put('/', r.clone()))
          return r
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (url.origin === location.origin && url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheDabord(request, COQUILLE))
    return
  }

  if (url.origin === location.origin && (url.pathname.startsWith('/uploads/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/logo/'))) {
    e.respondWith(cacheDabord(request, MEDIAS))
    return
  }

  // tuiles OpenStreetMap : celles déjà vues servent hors connexion (aucun téléchargement en masse)
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(cacheDabord(request, TUILES).catch(() => new Response('', { status: 504 })))
  }
})

self.addEventListener('push', (e) => {
  let n = {}
  try {
    n = e.data?.json() ?? {}
  } catch {
    n = { titre: e.data?.text() }
  }
  e.waitUntil(
    self.registration.showNotification(n.titre || 'Tanàna Madio', {
      body: n.message || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { lien: n.lien || '/' },
      lang: 'fr',
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const cible = new URL(e.notification.data?.lien || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url.startsWith(self.location.origin))
      if (ouverte) return ouverte.navigate(cible).then((f) => (f ?? ouverte).focus())
      return self.clients.openWindow(cible)
    }),
  )
})

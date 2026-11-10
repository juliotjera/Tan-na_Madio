// Service worker de Tanàna Madio : l'application s'ouvre même avec un réseau faible ou absent.
// - fichiers compilés (/assets, nom avec empreinte) : cache d'abord ;
// - pages : réseau d'abord, page en cache si le réseau ne répond pas ;
// - photos des signalements : cache d'abord, complété au fil de l'usage (taille limitée) ;
//   (les tuiles de carte, d'un autre domaine, restent gérées par le navigateur) ;
// - API : jamais mise en cache (données toujours fraîches et propres à chaque compte).
const VERSION = 'tm-v1'
const COQUILLE = `${VERSION}-coquille`
const MEDIAS = `${VERSION}-medias`
const MAX_MEDIAS = 300

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(COQUILLE)
      .then((c) => c.addAll(['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
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

  if (url.origin === location.origin && url.pathname.startsWith('/uploads/')) {
    e.respondWith(cacheDabord(request, MEDIAS))
  }
})

// Import du réseau routier réel d'Antananarivo depuis OpenStreetMap (API Overpass).
// Garde les rues praticables par un camion, découpe chaque rue aux carrefours et enregistre
// le résultat dans scripts/donnees/reseau-tana.json, utilisé ensuite par le jeu de données.
//
//   node scripts/importerOsm.js
//
// Données © contributeurs OpenStreetMap, licence ODbL (https://www.openstreetmap.org/copyright).
const fs = require('fs')
const path = require('path')
const { haversine } = require('../src/utils/geoUtils')

// Rectangle couvrant les cinq zones de démonstration, avec une marge
const ZONE = { sud: -18.932, ouest: 47.516, nord: -18.888, est: 47.566 }
const ROUTES = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link'
const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter'
const SORTIE = path.join(__dirname, 'donnees', 'reseau-tana.json')

// Vitesse moyenne d'un camion de collecte selon le type de rue (km/h)
const VITESSES = { motorway: 50, trunk: 40, primary: 30, secondary: 25, tertiary: 22, unclassified: 18, residential: 15, living_street: 10 }
const vitesse = (type) => VITESSES[type.replace('_link', '')] ?? 15
const arrondi = (v) => Math.round(v * 1e5) / 1e5

async function telecharger() {
  const requete = `[out:json][timeout:90];way["highway"~"^(${ROUTES})$"]["access"!~"no|private"](${ZONE.sud},${ZONE.ouest},${ZONE.nord},${ZONE.est});(._;>;);out body;`
  const reponse = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'TananaMadio/1.0 (projet etudiant)' },
    body: `data=${encodeURIComponent(requete)}`,
  })
  if (!reponse.ok) throw new Error(`Overpass : ${reponse.status} ${await reponse.text()}`)
  return reponse.json()
}

function construire(osm) {
  const points = new Map()
  for (const e of osm.elements) if (e.type === 'node') points.set(e.id, [arrondi(e.lat), arrondi(e.lon)])
  const voies = osm.elements.filter((e) => e.type === 'way' && e.nodes.length > 1)

  // un point devient un carrefour s'il est partagé par plusieurs rues ou s'il termine une rue
  const usages = new Map()
  for (const v of voies) v.nodes.forEach((n, i) => usages.set(n, (usages.get(n) ?? 0) + (i === 0 || i === v.nodes.length - 1 ? 2 : 1)))
  const index = new Map()
  const noeuds = []
  const sommet = (n) => {
    if (!index.has(n)) {
      index.set(n, noeuds.length)
      noeuds.push(points.get(n))
    }
    return index.get(n)
  }

  const aretes = []
  for (const v of voies) {
    const tags = v.tags ?? {}
    const sens = tags.oneway === 'yes' || tags.oneway === '1' || tags.junction === 'roundabout' ? 1 : tags.oneway === '-1' ? -1 : 0
    let depart = 0
    for (let i = 1; i < v.nodes.length; i++) {
      if (i < v.nodes.length - 1 && (usages.get(v.nodes[i]) ?? 0) < 2) continue
      const morceau = v.nodes.slice(depart, i + 1).map((n) => points.get(n))
      if (morceau.some((p) => !p)) {
        depart = i
        continue
      }
      let metres = 0
      for (let k = 1; k < morceau.length; k++) metres += haversine(morceau[k - 1][0], morceau[k - 1][1], morceau[k][0], morceau[k][1]) * 1000
      let a = sommet(v.nodes[depart])
      let b = sommet(v.nodes[i])
      let forme = morceau.slice(1, -1)
      if (sens === -1) {
        ;[a, b] = [b, a]
        forme = forme.reverse()
      }
      if (a !== b && metres > 0.5) {
        const minutes = (metres / 1000 / vitesse(tags.highway)) * 60
        aretes.push([a, b, Math.round(metres * 100) / 100, Math.round(minutes * 100) / 100, sens === 0, forme])
      }
      depart = i
    }
  }

  // un seul tronçon par paire de carrefours (le plus court)
  const meilleurs = new Map()
  for (const ar of aretes) {
    const cle = `${ar[0]}>${ar[1]}`
    if (!meilleurs.has(cle) || meilleurs.get(cle)[2] > ar[2]) meilleurs.set(cle, ar)
  }
  return garderComposantePrincipale(noeuds, [...meilleurs.values()])
}

// Les morceaux isolés (parking, impasse coupée par la limite de la zone) sont retirés :
// on garde la plus grande partie connexe du réseau, puis on renumérote les carrefours
function garderComposantePrincipale(noeuds, aretes) {
  const voisins = noeuds.map(() => [])
  for (const [a, b] of aretes) {
    voisins[a].push(b)
    voisins[b].push(a)
  }
  const composante = new Array(noeuds.length).fill(-1)
  const tailles = []
  for (let depart = 0; depart < noeuds.length; depart++) {
    if (composante[depart] !== -1) continue
    const numero = tailles.length
    let taille = 0
    const pile = [depart]
    composante[depart] = numero
    while (pile.length) {
      const n = pile.pop()
      taille++
      for (const v of voisins[n]) if (composante[v] === -1) (composante[v] = numero), pile.push(v)
    }
    tailles.push(taille)
  }
  const principale = tailles.indexOf(Math.max(...tailles))
  const nouvelIndex = new Map()
  const gardes = []
  noeuds.forEach((p, i) => {
    if (composante[i] === principale) {
      nouvelIndex.set(i, gardes.length)
      gardes.push(p)
    }
  })
  return {
    noeuds: gardes,
    aretes: aretes.filter(([a]) => composante[a] === principale).map(([a, b, ...reste]) => [nouvelIndex.get(a), nouvelIndex.get(b), ...reste]),
  }
}

async function principal() {
  console.log('Téléchargement des rues depuis OpenStreetMap…')
  const osm = await telecharger()
  const reseau = construire(osm)
  fs.mkdirSync(path.dirname(SORTIE), { recursive: true })
  fs.writeFileSync(
    SORTIE,
    JSON.stringify({
      source: '© contributeurs OpenStreetMap (ODbL)',
      date: new Date().toISOString().slice(0, 10),
      zone: ZONE,
      ...reseau,
    }),
  )
  console.log(`${reseau.noeuds.length} carrefours, ${reseau.aretes.length} tronçons → ${path.relative(process.cwd(), SORTIE)}`)
}

if (require.main === module) {
  principal().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}

module.exports = { construire }

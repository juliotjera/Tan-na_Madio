// Réseau routier : chargement du graphe (noeuds_graphe / aretes_graphe) et distances
// les plus courtes entre les points d'une tournée, calculées avec Dijkstra.
const db = require('../config/db')
const { dijkstra, chemin, construireGraphe } = require('../algorithms/dijkstra')
const { haversine } = require('../utils/geoUtils')

// Sans réseau routier connu, la distance réelle est estimée : vol d'oiseau × détour moyen en ville
const FACTEUR_DETOUR = 1.3

async function chargerGraphe() {
  const noeuds = (
    await db.query(`SELECT id, ST_Y(position::geometry) AS lat, ST_X(position::geometry) AS lng FROM noeuds_graphe`)
  ).rows.map((n) => ({ ...n, lat: Number(n.lat), lng: Number(n.lng) }))
  const aretes = (await db.query(`SELECT noeud_source, noeud_dest, distance_m, bidirectionnel, trace FROM aretes_graphe`)).rows
  const graphe = construireGraphe(
    aretes.map((a) => ({ source: a.noeud_source, dest: a.noeud_dest, poids: Number(a.distance_m) / 1000, bidirectionnel: a.bidirectionnel })),
  )
  // forme de chaque tronçon dans les deux sens, pour dessiner le chemin le long des rues
  const formes = new Map()
  for (const a of aretes) {
    if (!a.trace?.length) continue
    formes.set(`${a.noeud_source}>${a.noeud_dest}`, a.trace)
    if (a.bidirectionnel) formes.set(`${a.noeud_dest}>${a.noeud_source}`, [...a.trace].reverse())
  }
  return { noeuds, parId: new Map(noeuds.map((n) => [n.id, n])), graphe, formes }
}

// suite de carrefours → points à dessiner, avec la forme des rues entre deux carrefours
function dessiner(etapes, parId, formes) {
  const points = []
  etapes.forEach((id, i) => {
    if (i > 0) points.push(...(formes.get(`${etapes[i - 1]}>${id}`) ?? []))
    const n = parId.get(id)
    points.push([n.lat, n.lng])
  })
  return points
}

const plusProche = (p, noeuds) =>
  noeuds.reduce((meilleur, n) => {
    const d = haversine(p.lat, p.lng, n.lat, n.lng)
    return !meilleur || d < meilleur.d ? { noeud: n, d } : meilleur
  }, null)

// points : [{ lat, lng }] → matrice des distances (km) et tracés entre chaque paire
async function matriceDistances(points) {
  const { noeuds, parId, graphe, formes } = await chargerGraphe()
  const n = points.length
  const matrice = Array.from({ length: n }, () => new Array(n).fill(0))
  const traces = Array.from({ length: n }, () => new Array(n).fill(null))

  if (noeuds.length === 0) {
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (i !== j) {
          matrice[i][j] = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng) * FACTEUR_DETOUR
          traces[i][j] = [[points[i].lat, points[i].lng], [points[j].lat, points[j].lng]]
        }
    return { matrice, traces, methode: 'estimation' }
  }

  // chaque point est rattaché au noeud du réseau le plus proche (accès à pied/au camion)
  const acces = points.map((p) => plusProche(p, noeuds))
  for (let i = 0; i < n; i++) {
    const { distances, precedent } = dijkstra(graphe, acces[i].noeud.id)
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const routier = distances.get(acces[j].noeud.id)
      if (routier === undefined) {
        // noeud inaccessible : estimation pour ne pas bloquer la tournée
        matrice[i][j] = haversine(points[i].lat, points[i].lng, points[j].lat, points[j].lng) * FACTEUR_DETOUR
        traces[i][j] = [[points[i].lat, points[i].lng], [points[j].lat, points[j].lng]]
        continue
      }
      matrice[i][j] = acces[i].d + routier + acces[j].d
      const etapes = chemin(precedent, acces[i].noeud.id, acces[j].noeud.id) ?? []
      traces[i][j] = [
        [points[i].lat, points[i].lng],
        ...dessiner(etapes, parId, formes),
        [points[j].lat, points[j].lng],
      ]
    }
  }
  return { matrice, traces, methode: 'dijkstra' }
}

module.exports = { chargerGraphe, matriceDistances, FACTEUR_DETOUR }

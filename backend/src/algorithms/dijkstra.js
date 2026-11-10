// Algorithme de Dijkstra avec un tas binaire minimum (Min-Heap)
// sur un graphe pondéré orienté : le réseau routier (tables noeuds_graphe / aretes_graphe).
//
// Complexité : O((V + E) log V) grâce au tas, au lieu de O(V²) avec une simple liste.

class MinHeap {
  constructor() {
    this.heap = []
  }

  get size() {
    return this.heap.length
  }

  push(item) {
    this.heap.push(item)
    this._bubbleUp(this.heap.length - 1)
  }

  // retire et renvoie l'élément de plus petite distance
  pop() {
    const min = this.heap[0]
    const last = this.heap.pop()
    if (this.heap.length > 0) {
      this.heap[0] = last
      this._sinkDown(0)
    }
    return min
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2)
      if (this.heap[parent].dist <= this.heap[i].dist) break
      ;[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]]
      i = parent
    }
  }

  _sinkDown(i) {
    const n = this.heap.length
    for (;;) {
      let min = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this.heap[l].dist < this.heap[min].dist) min = l
      if (r < n && this.heap[r].dist < this.heap[min].dist) min = r
      if (min === i) break
      ;[this.heap[min], this.heap[i]] = [this.heap[i], this.heap[min]]
      i = min
    }
  }
}

// graphe : Map(noeud → [{ vers, poids }])
// Renvoie les distances les plus courtes depuis « source » et le prédécesseur de chaque noeud.
function dijkstra(graphe, source) {
  const distances = new Map([[source, 0]])
  const precedent = new Map()
  const visites = new Set()
  const tas = new MinHeap()
  tas.push({ noeud: source, dist: 0 })

  while (tas.size > 0) {
    const { noeud: u, dist: du } = tas.pop()
    if (visites.has(u)) continue // entrée périmée du tas
    visites.add(u)
    for (const { vers: v, poids } of graphe.get(u) ?? []) {
      const nouvelle = du + poids
      if (nouvelle < (distances.get(v) ?? Infinity)) {
        distances.set(v, nouvelle)
        precedent.set(v, u)
        tas.push({ noeud: v, dist: nouvelle })
      }
    }
  }
  return { distances, precedent }
}

// Chemin de « source » à « cible » reconstruit depuis les prédécesseurs (null si inaccessible)
function chemin(precedent, source, cible) {
  if (source === cible) return [source]
  if (!precedent.has(cible)) return null
  const etapes = [cible]
  let courant = cible
  while (courant !== source) {
    courant = precedent.get(courant)
    etapes.push(courant)
  }
  return etapes.reverse()
}

// Graphe à partir d'arêtes { source, dest, poids, bidirectionnel }
function construireGraphe(aretes) {
  const graphe = new Map()
  const ajouter = (a, b, poids) => {
    if (!graphe.has(a)) graphe.set(a, [])
    graphe.get(a).push({ vers: b, poids })
  }
  for (const { source, dest, poids, bidirectionnel = true } of aretes) {
    ajouter(source, dest, poids)
    if (bidirectionnel) ajouter(dest, source, poids)
  }
  return graphe
}

module.exports = { MinHeap, dijkstra, chemin, construireGraphe }

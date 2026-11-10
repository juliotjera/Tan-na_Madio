// Algorithmes : tas binaire, Dijkstra, plus proche voisin + 2-opt, sélection gloutonne par capacité
const { MinHeap, dijkstra, chemin, construireGraphe } = require('../src/algorithms/dijkstra')
const { plusProcheVoisin, deuxOpt, optimiserOrdre, longueur, selectionnerPourCamion } = require('../src/algorithms/glouton')
const { haversine } = require('../src/utils/geoUtils')

describe('MinHeap', () => {
  test('rend les éléments du plus petit au plus grand', () => {
    const tas = new MinHeap()
    for (const p of [5, 1, 8, 3, 9, 2, 7]) tas.push({ dist: p, noeud: p })
    const sortie = []
    while (tas.size) sortie.push(tas.pop().dist)
    expect(sortie).toEqual([1, 2, 3, 5, 7, 8, 9])
  })
})

describe('Dijkstra', () => {
  // A —1— B —1— C, et un raccourci apparent A —5— C ; D isolé ; E atteignable par un sens unique
  const graphe = construireGraphe([
    { source: 'A', dest: 'B', poids: 1, bidirectionnel: true },
    { source: 'B', dest: 'C', poids: 1, bidirectionnel: true },
    { source: 'A', dest: 'C', poids: 5, bidirectionnel: true },
    { source: 'C', dest: 'E', poids: 2, bidirectionnel: false },
    { source: 'D', dest: 'D2', poids: 1, bidirectionnel: true },
  ])

  test('trouve le plus court chemin, pas le plus direct', () => {
    const { distances, precedent } = dijkstra(graphe, 'A')
    expect(distances.get('C')).toBe(2)
    expect(chemin(precedent, 'A', 'C')).toEqual(['A', 'B', 'C'])
  })

  test('respecte les sens uniques', () => {
    expect(dijkstra(graphe, 'A').distances.get('E')).toBe(4)
    expect(dijkstra(graphe, 'E').distances.get('A')).toBeUndefined()
  })

  test('signale un noeud inaccessible', () => {
    const { distances, precedent } = dijkstra(graphe, 'A')
    expect(distances.has('D')).toBe(false)
    expect(chemin(precedent, 'A', 'D')).toBeNull()
  })
})

describe('Ordre de tournée (glouton + 2-opt)', () => {
  // points sur une ligne, donnés dans le désordre : l'ordre optimal est 0 → 1 → 2 → 3 → 4 (positions croissantes)
  const positions = [0, 3, 1, 4, 2]
  const matrice = positions.map((a) => positions.map((b) => Math.abs(a - b)))

  test('plus proche voisin : visite chaque point une fois, en partant du premier', () => {
    const ordre = plusProcheVoisin(matrice)
    expect(ordre[0]).toBe(0)
    expect([...ordre].sort()).toEqual([0, 1, 2, 3, 4])
  })

  test('2-opt ne rallonge jamais la tournée', () => {
    const ordre = [0, 1, 2, 3, 4]
    expect(longueur(deuxOpt(ordre, matrice), matrice)).toBeLessThanOrEqual(longueur(ordre, matrice))
  })

  test('optimiserOrdre mesure le gain face à l’ordre de la sélection', () => {
    const r = optimiserOrdre(matrice)
    expect(r.distance_km).toBe(4)
    expect(r.distance_naive_km).toBe(10)
    expect(r.gain_pourcent).toBeCloseTo(60)
  })

  test('jamais pire que l’ordre naïf, même sur des points aléatoires', () => {
    for (let essai = 0; essai < 50; essai++) {
      const pts = Array.from({ length: 8 }, () => [Math.random(), Math.random()])
      const m = pts.map((a) => pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])))
      expect(optimiserOrdre(m).gain_pourcent).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('Sélection par capacité', () => {
  const s = (id, urgence, jour) => ({ id, urgence, created_at: `2026-05-${jour}` })

  test('les plus urgents d’abord, sans dépasser la capacité', () => {
    const { retenus, charge_estimee_kg } = selectionnerPourCamion(
      [s('a', 'faible', 10), s('b', 'critique', 12), s('c', 'eleve', 11), s('d', 'critique', 9), s('e', 'moyen', 1)],
      1000,
    )
    expect(retenus.map((r) => r.id)).toEqual(['d', 'b', 'e', 'a']) // 400 + 400 + 120 + 50 ; « c » (250) ne tient plus
    expect(charge_estimee_kg).toBe(970)
  })
})

test('Haversine : Analakely → Isotry ≈ 0,94 km', () => {
  expect(haversine(-18.9137, 47.5361, -18.92, 47.53)).toBeCloseTo(0.94, 1)
})

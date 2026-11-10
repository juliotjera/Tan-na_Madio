// Algorithmes gloutons pour la planification des tournées.
//
// 1. Ordre de visite (problème du voyageur de commerce, approché) :
//    - plus proche voisin : depuis le point courant, aller au point non visité le plus proche ;
//    - amélioration 2-opt : inverser un tronçon de la tournée tant que cela la raccourcit
//      (supprime les croisements laissés par le glouton).
// 2. Sélection des signalements pour un camion : par urgence, dans la limite de sa capacité.

// matrice[i][j] = distance (km) du point i au point j ; le point 0 est le départ
function plusProcheVoisin(matrice) {
  const n = matrice.length
  if (n === 0) return []
  const ordre = [0]
  const visites = new Set([0])
  while (ordre.length < n) {
    const dernier = ordre.at(-1)
    let meilleur = -1
    for (let j = 0; j < n; j++) {
      if (!visites.has(j) && (meilleur === -1 || matrice[dernier][j] < matrice[dernier][meilleur])) meilleur = j
    }
    visites.add(meilleur)
    ordre.push(meilleur)
  }
  return ordre
}

const longueur = (ordre, matrice) => ordre.slice(1).reduce((total, j, k) => total + matrice[ordre[k]][j], 0)

// 2-opt : le départ (indice 0) reste en tête ; tournée ouverte (pas de retour au départ)
function deuxOpt(ordre, matrice) {
  let meilleur = [...ordre]
  let amelioration = true
  while (amelioration) {
    amelioration = false
    for (let i = 1; i < meilleur.length - 1; i++) {
      for (let k = i + 1; k < meilleur.length; k++) {
        const essai = [...meilleur.slice(0, i), ...meilleur.slice(i, k + 1).reverse(), ...meilleur.slice(k + 1)]
        if (longueur(essai, matrice) < longueur(meilleur, matrice) - 1e-9) {
          meilleur = essai
          amelioration = true
        }
      }
    }
  }
  return meilleur
}

// Ordre optimisé + gain par rapport à l'ordre de sélection (ordre « naïf »)
function optimiserOrdre(matrice) {
  const naif = matrice.map((_, i) => i)
  // 2-opt appliqué au tour glouton et à l'ordre de départ : on garde le meilleur (jamais pire que l'ordre naïf)
  const optimise = [deuxOpt(plusProcheVoisin(matrice), matrice), deuxOpt(naif, matrice)].reduce((a, b) =>
    longueur(b, matrice) < longueur(a, matrice) ? b : a,
  )
  const dNaif = longueur(naif, matrice)
  const dOptimise = longueur(optimise, matrice)
  return {
    ordre: optimise,
    distance_km: dOptimise,
    distance_naive_km: dNaif,
    gain_pourcent: dNaif > 0 ? ((dNaif - dOptimise) / dNaif) * 100 : 0,
  }
}

// Poids estimé d'un dépôt selon son urgence (kg), faute de pesée sur place
const POIDS_ESTIME_KG = { faible: 50, moyen: 120, eleve: 250, critique: 400 }
const PRIORITE = { critique: 0, eleve: 1, moyen: 2, faible: 3 }

// Glouton par urgence puis ancienneté, tant que la capacité du camion le permet
function selectionnerPourCamion(signalements, capaciteKg) {
  const tries = [...signalements].sort(
    (a, b) => PRIORITE[a.urgence] - PRIORITE[b.urgence] || new Date(a.created_at) - new Date(b.created_at),
  )
  const retenus = []
  let charge = 0
  for (const s of tries) {
    const poids = POIDS_ESTIME_KG[s.urgence] ?? 120
    if (charge + poids > capaciteKg) continue
    retenus.push(s)
    charge += poids
  }
  return { retenus, charge_estimee_kg: charge }
}

module.exports = { plusProcheVoisin, deuxOpt, optimiserOrdre, longueur, selectionnerPourCamion, POIDS_ESTIME_KG }

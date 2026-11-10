// Optimisation d'une tournée de collecte :
// 1. distances routières entre tous les points (Dijkstra sur le réseau routier) ;
// 2. ordre de visite : plus proche voisin, amélioré par 2-opt (algorithmes gloutons) ;
// 3. itinéraire à afficher : enchaînement des plus courts chemins.
const db = require('../config/db')
const { optimiserOrdre } = require('../algorithms/glouton')
const { matriceDistances } = require('./grapheService')
const { ErreurApi } = require('../utils/helpers')

const VITESSE_KMH = 18 // vitesse moyenne d'un camion en ville
const MINUTES_PAR_POINT = 5 // chargement des déchets à chaque arrêt

async function optimiser({ signalement_ids, camion_id }) {
  if (!Array.isArray(signalement_ids) || signalement_ids.length === 0) {
    throw new ErreurApi(400, 'Sélectionnez au moins un signalement', 'SIGNALEMENTS_REQUIS')
  }
  const { rows } = await db.query(
    `SELECT id, statut, urgence, ST_Y(localisation::geometry) AS lat, ST_X(localisation::geometry) AS lng
       FROM signalements WHERE id = ANY($1::uuid[])`,
    [signalement_ids],
  )
  if (rows.length !== signalement_ids.length) throw new ErreurApi(404, 'Signalement introuvable', 'SIGNALEMENT_INTROUVABLE')
  const nonValides = rows.filter((s) => s.statut !== 'valide')
  if (nonValides.length) throw new ErreurApi(422, 'Seuls les signalements validés peuvent être planifiés', 'STATUT_INVALIDE')

  // ordre de la sélection conservé (sert de référence « naïve » pour mesurer le gain)
  const parId = new Map(rows.map((s) => [s.id, { ...s, lat: Number(s.lat), lng: Number(s.lng) }]))
  const points = signalement_ids.map((id) => parId.get(id))

  // départ : position du camion s'il en a une, sinon le premier point sélectionné
  let depart = null
  if (camion_id) {
    const c = await db.query(
      `SELECT ST_Y(position_actuelle::geometry) AS lat, ST_X(position_actuelle::geometry) AS lng FROM camions WHERE id = $1`,
      [camion_id],
    )
    if (c.rows[0]?.lat != null) depart = { id: null, lat: Number(c.rows[0].lat), lng: Number(c.rows[0].lng), depot: true }
  }
  const etapes = depart ? [depart, ...points] : points

  const { matrice, traces, methode } = await matriceDistances(etapes)
  const { ordre, distance_km, distance_naive_km, gain_pourcent } = optimiserOrdre(matrice)

  const visite = ordre.map((i) => etapes[i]).filter((e) => !e.depot)
  // tracé complet d'un ordre de visite : plus courts chemins mis bout à bout
  const tracer = (o) => o.slice(1).flatMap((j, k) => (k === 0 ? traces[o[k]][j] : traces[o[k]][j].slice(1)))
  const trace = tracer(ordre)
  const arrondi = (x) => Math.round(x * 100) / 100

  return {
    ordre_optimal: visite.map((e) => e.id),
    distance_km: arrondi(distance_km),
    distance_naive_km: arrondi(distance_naive_km),
    gain_pourcent: Math.round(gain_pourcent * 10) / 10,
    duree_estimee_min: Math.round((distance_km / VITESSE_KMH) * 60 + visite.length * MINUTES_PAR_POINT),
    methode, // « dijkstra » (réseau routier) ou « estimation » (vol d'oiseau × détour)
    depart: depart ? { latitude: depart.lat, longitude: depart.lng } : null,
    itineraire: visite.map((e, i) => ({ ordre: i + 1, signalement_id: e.id, urgence: e.urgence, latitude: e.lat, longitude: e.lng })),
    trace, // [[lat, lng], …] : tracé à dessiner sur la carte
    trace_naive: tracer(etapes.map((_, i) => i)), // ordre de la sélection, pour comparer
  }
}

module.exports = { optimiser, VITESSE_KMH }

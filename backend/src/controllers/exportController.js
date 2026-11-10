// Exports CSV pour le personnel (rapports, tableurs)
const db = require('../config/db')
const { journaliser } = require('../models')
const { ErreurApi, asyncHandler } = require('../utils/helpers')
const { versCsv, envoyerCsv, dateCsv, nombreCsv } = require('../utils/csv')

const STATUTS_SIGNALEMENT = ['en_attente', 'valide', 'en_cours', 'collecte', 'rejete']
const URGENCES = ['faible', 'moyen', 'eleve', 'critique']
const STATUTS_COLLECTE = ['planifiee', 'en_cours', 'terminee', 'annulee']

function periode(query) {
  const conditions = []
  const params = []
  if (query.debut) {
    const d = new Date(query.debut)
    if (Number.isNaN(d.getTime())) throw new ErreurApi(400, 'Date de début invalide', 'PERIODE_INVALIDE')
    params.push(d.toISOString())
    conditions.push(`>= $${params.length}`)
  }
  if (query.fin) {
    const f = new Date(query.fin)
    if (Number.isNaN(f.getTime())) throw new ErreurApi(400, 'Date de fin invalide', 'PERIODE_INVALIDE')
    params.push(f.toISOString())
    conditions.push(`<= $${params.length}`)
  }
  return { conditions, params }
}

const signalements = asyncHandler(async (req, res) => {
  const { statut, urgence, zone_id } = req.query
  if (statut && !STATUTS_SIGNALEMENT.includes(statut)) throw new ErreurApi(400, 'Valeur de statut inconnue', 'FILTRE_INVALIDE')
  if (urgence && !URGENCES.includes(urgence)) throw new ErreurApi(400, "Valeur d'urgence inconnue", 'FILTRE_INVALIDE')
  const { conditions: dates, params } = periode(req.query)
  const conditions = dates.map((c) => `s.created_at ${c}`)
  if (statut) conditions.push(`s.statut = $${params.push(statut)}`)
  if (urgence) conditions.push(`s.urgence = $${params.push(urgence)}`)
  if (zone_id) conditions.push(`s.zone_id = $${params.push(zone_id)}`)
  const { rows } = await db.query(
    `SELECT s.created_at, s.statut, s.urgence, z.nom AS zone, s.adresse, s.description,
            ST_Y(s.localisation::geometry) AS latitude, ST_X(s.localisation::geometry) AS longitude,
            u.prenom || ' ' || u.nom AS declarant, s.date_validation, s.photo_url
       FROM signalements s LEFT JOIN zones z ON z.id = s.zone_id LEFT JOIN utilisateurs u ON u.id = s.citoyen_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY s.created_at DESC LIMIT 20000`,
    params,
  )
  await journaliser(req, 'export', 'signalement', null, { lignes: rows.length })
  envoyerCsv(
    res,
    'signalements',
    versCsv(rows, [
      ['Date', (r) => dateCsv(r.created_at)],
      ['Statut', (r) => r.statut],
      ['Urgence', (r) => r.urgence],
      ['Zone', (r) => r.zone ?? 'Hors zone'],
      ['Adresse', (r) => r.adresse],
      ['Description', (r) => r.description],
      ['Latitude', (r) => nombreCsv(Number(r.latitude).toFixed(6))],
      ['Longitude', (r) => nombreCsv(Number(r.longitude).toFixed(6))],
      ['Déclarant', (r) => r.declarant],
      ['Validé le', (r) => dateCsv(r.date_validation)],
      ['Photo', (r) => (r.photo_url ? 'oui' : 'non')],
    ]),
  )
})

const collectes = asyncHandler(async (req, res) => {
  const { statut } = req.query
  if (statut && !STATUTS_COLLECTE.includes(statut)) throw new ErreurApi(400, 'Valeur de statut inconnue', 'FILTRE_INVALIDE')
  const { conditions: dates, params } = periode(req.query)
  const conditions = dates.map((c) => `co.date_planifiee ${c}`)
  if (statut) conditions.push(`co.statut = $${params.push(statut)}`)
  const { rows } = await db.query(
    `SELECT co.date_planifiee, co.statut, ca.immatriculation, z.nom AS zone, ag.prenom || ' ' || ag.nom AS agent,
            ch.prenom || ' ' || ch.nom AS chauffeur,
            (SELECT count(*) FROM collecte_signalements cs WHERE cs.collecte_id = co.id)::int AS arrets,
            (SELECT count(*) FROM collecte_signalements cs WHERE cs.collecte_id = co.id AND cs.collecte_fait)::int AS collectes,
            co.distance_km::float, (co.itineraire->>'distance_naive_km')::float AS distance_naive_km,
            (co.itineraire->>'gain_pourcent')::float AS gain_pourcent, co.poids_collecte_kg::float, co.date_debut, co.date_fin
       FROM collectes co JOIN camions ca ON ca.id = co.camion_id
       LEFT JOIN zones z ON z.id = co.zone_id LEFT JOIN utilisateurs ag ON ag.id = co.agent_id
       LEFT JOIN utilisateurs ch ON ch.id = ca.chauffeur_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY co.date_planifiee DESC LIMIT 20000`,
    params,
  )
  await journaliser(req, 'export', 'collecte', null, { lignes: rows.length })
  envoyerCsv(
    res,
    'collectes',
    versCsv(rows, [
      ['Départ prévu', (r) => dateCsv(r.date_planifiee)],
      ['Statut', (r) => r.statut],
      ['Camion', (r) => r.immatriculation],
      ['Zone', (r) => r.zone ?? 'Plusieurs zones'],
      ['Planifiée par', (r) => r.agent],
      ['Chauffeur', (r) => r.chauffeur],
      ['Arrêts', (r) => r.arrets],
      ['Arrêts collectés', (r) => r.collectes],
      ['Distance (km)', (r) => nombreCsv(r.distance_km)],
      ['Distance sans optimisation (km)', (r) => nombreCsv(r.distance_naive_km)],
      ['Gain (%)', (r) => nombreCsv(r.gain_pourcent)],
      ['Poids collecté (kg)', (r) => nombreCsv(r.poids_collecte_kg)],
      ['Début', (r) => dateCsv(r.date_debut)],
      ['Fin', (r) => dateCsv(r.date_fin)],
    ]),
  )
})

module.exports = { signalements, collectes }

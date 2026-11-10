// Collectes (tournées planifiées) et leurs signalements ordonnés
const db = require('../config/db')

const CHAMPS = `co.id, co.statut, co.date_planifiee, co.date_debut, co.date_fin, co.itineraire,
  co.distance_km::float AS distance_km, co.nb_signalements_traites, co.poids_collecte_kg::float AS poids_collecte_kg,
  co.notes, co.created_at, co.camion_id, co.agent_id, co.zone_id,
  ca.immatriculation AS camion_immatriculation, ca.chauffeur_id,
  z.nom AS zone_nom, ag.prenom || ' ' || ag.nom AS agent_nom,
  (SELECT count(*)::int FROM collecte_signalements cs WHERE cs.collecte_id = co.id) AS nb_points,
  (SELECT count(*)::int FROM collecte_signalements cs WHERE cs.collecte_id = co.id AND cs.collecte_fait) AS nb_faits`
const JOINTURES = `FROM collectes co JOIN camions ca ON ca.id = co.camion_id
  LEFT JOIN zones z ON z.id = co.zone_id LEFT JOIN utilisateurs ag ON ag.id = co.agent_id`

async function lister({ statut, camion_id, zone_id, chauffeur_id, limit, offset }) {
  const conditions = []
  const params = []
  if (statut) conditions.push(`co.statut = $${params.push(statut)}`)
  if (camion_id) conditions.push(`co.camion_id = $${params.push(camion_id)}`)
  if (zone_id) conditions.push(`co.zone_id = $${params.push(zone_id)}`)
  if (chauffeur_id) conditions.push(`ca.chauffeur_id = $${params.push(chauffeur_id)}`)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = (await db.query(`SELECT count(*)::int AS n ${JOINTURES} ${where}`, params)).rows[0].n
  const { rows } = await db.query(
    // en liste, l'itinéraire sans ses tracés (lourds) : ils ne servent qu'au détail
    `SELECT ${CHAMPS.replace('co.itineraire', "(co.itineraire - 'trace' - 'trace_naive') AS itineraire")} ${JOINTURES} ${where} ORDER BY co.date_planifiee DESC LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
    params,
  )
  return { collectes: rows, total }
}

async function parId(id, executer = db) {
  const { rows } = await executer.query(`SELECT ${CHAMPS} ${JOINTURES} WHERE co.id = $1`, [id])
  if (!rows[0]) return null
  const points = await executer.query(
    `SELECT cs.ordre, cs.collecte_fait, s.id, s.statut, s.urgence, s.description, s.adresse, s.photo_url, s.citoyen_id,
            ST_Y(s.localisation::geometry) AS latitude, ST_X(s.localisation::geometry) AS longitude
       FROM collecte_signalements cs JOIN signalements s ON s.id = cs.signalement_id
      WHERE cs.collecte_id = $1 ORDER BY cs.ordre`,
    [id],
  )
  return { ...rows[0], signalements: points.rows.map((p) => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) })) }
}

module.exports = { lister, parId }

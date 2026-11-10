// Signalements de dépôts de déchets (point GPS PostGIS, photo, urgence, statut)
const db = require('../config/db')

const CHAMPS = `s.id, s.statut, s.urgence, s.description, s.adresse, s.photo_url, s.created_at, s.updated_at,
  s.date_validation, s.zone_id, s.citoyen_id,
  ST_Y(s.localisation::geometry) AS latitude, ST_X(s.localisation::geometry) AS longitude,
  z.nom AS zone_nom, u.prenom || ' ' || u.nom AS citoyen_nom`
const JOINTURES = 'FROM signalements s LEFT JOIN zones z ON z.id = s.zone_id LEFT JOIN utilisateurs u ON u.id = s.citoyen_id'

const numeriser = (s) => s && { ...s, latitude: Number(s.latitude), longitude: Number(s.longitude) }

async function lister({ statut, urgence, zone_id, citoyen_id, limit, offset }) {
  const conditions = []
  const params = []
  if (statut) conditions.push(`s.statut = $${params.push(statut)}`)
  if (urgence) conditions.push(`s.urgence = $${params.push(urgence)}`)
  if (zone_id) conditions.push(`s.zone_id = $${params.push(zone_id)}`)
  if (citoyen_id) conditions.push(`s.citoyen_id = $${params.push(citoyen_id)}`)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = (await db.query(`SELECT count(*)::int AS n FROM signalements s ${where}`, params)).rows[0].n
  const { rows } = await db.query(
    `SELECT ${CHAMPS} ${JOINTURES} ${where}
      ORDER BY CASE s.urgence WHEN 'critique' THEN 0 WHEN 'eleve' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END, s.created_at DESC
      LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
    params,
  )
  return { signalements: rows.map(numeriser), total }
}

// Pour la carte : la vue signalements_carte (non rejetés)
async function carte({ statut, urgence }) {
  const conditions = []
  const params = []
  if (statut) conditions.push(`statut = $${params.push(statut)}`)
  if (urgence) conditions.push(`urgence = $${params.push(urgence)}`)
  const { rows } = await db.query(
    `SELECT * FROM signalements_carte ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 1000`,
    params,
  )
  return rows.map(numeriser)
}

async function parId(id) {
  const { rows } = await db.query(`SELECT ${CHAMPS} ${JOINTURES} WHERE s.id = $1`, [id])
  return numeriser(rows[0] ?? null)
}

async function creer({ citoyen_id, latitude, longitude, description, adresse, urgence, photo_url }, executer = db) {
  const { rows } = await executer.query(
    `INSERT INTO signalements (citoyen_id, localisation, description, adresse, urgence, photo_url)
     VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $5, $6, $7) RETURNING id`,
    [citoyen_id, longitude, latitude, description ?? null, adresse ?? null, urgence, photo_url],
  )
  return rows[0].id
}

async function changerStatut(id, statut, agentId, executer = db) {
  const { rows } = await executer.query(
    `UPDATE signalements
        SET statut = $2::statut_signalement,
            valide_par = CASE WHEN $2::statut_signalement IN ('valide', 'rejete') THEN $3::uuid ELSE valide_par END,
            date_validation = CASE WHEN $2::statut_signalement IN ('valide', 'rejete') THEN NOW() ELSE date_validation END
      WHERE id = $1 RETURNING id, statut, citoyen_id`,
    [id, statut, agentId],
  )
  return rows[0] ?? null
}

const supprimer = async (id) => (await db.query('DELETE FROM signalements WHERE id = $1 RETURNING id, photo_url', [id])).rows[0] ?? null

module.exports = { lister, carte, parId, creer, changerStatut, supprimer }

// Zones de collecte (polygone PostGIS + centroïde)
const db = require('../config/db')
const { polygoneWkt } = require('../utils/geoUtils')

const CHAMPS = `z.id, z.nom, z.description, z.frequence_collecte_jours, z.actif, z.created_at,
  ST_Y(z.centroide::geometry) AS centre_lat, ST_X(z.centroide::geometry) AS centre_lng,
  ST_AsGeoJSON(z.geometrie)::json AS geometrie`

async function lister() {
  const { rows } = await db.query(
    `SELECT ${CHAMPS}, count(s.id)::int AS nb_signalements,
            count(s.id) FILTER (WHERE s.statut IN ('en_attente', 'valide'))::int AS nb_a_traiter,
            count(s.id) FILTER (WHERE s.statut = 'valide')::int AS nb_valides
       FROM zones z LEFT JOIN signalements s ON s.zone_id = z.id
      GROUP BY z.id ORDER BY z.nom`,
  )
  return rows
}

async function parId(id) {
  const { rows } = await db.query(`SELECT ${CHAMPS} FROM zones z WHERE z.id = $1`, [id])
  return rows[0] ?? null
}

// points : [[lat, lng], …] (au moins 3) ; le centroïde est calculé par PostGIS
async function creer({ nom, description, frequence_collecte_jours, points }) {
  const wkt = points?.length >= 3 ? polygoneWkt(points) : null
  const { rows } = await db.query(
    `INSERT INTO zones (nom, description, frequence_collecte_jours, geometrie, centroide)
     VALUES ($1, $2, $3, ST_GeogFromText($4), ST_Centroid(ST_GeogFromText($4)::geometry)::geography) RETURNING id`,
    [nom, description ?? null, frequence_collecte_jours ?? 7, wkt],
  )
  return parId(rows[0].id)
}

async function modifier(id, { nom, description, frequence_collecte_jours, actif, points }) {
  const wkt = points?.length >= 3 ? polygoneWkt(points) : null
  const { rows } = await db.query(
    `UPDATE zones SET nom = COALESCE($2, nom), description = COALESCE($3, description),
            frequence_collecte_jours = COALESCE($4, frequence_collecte_jours), actif = COALESCE($5, actif),
            geometrie = COALESCE(ST_GeogFromText($6), geometrie),
            centroide = COALESCE(ST_Centroid(ST_GeogFromText($6)::geometry)::geography, centroide)
      WHERE id = $1 RETURNING id`,
    [id, nom ?? null, description ?? null, frequence_collecte_jours ?? null, actif ?? null, wkt],
  )
  return rows[0] ? parId(id) : null
}

const supprimer = async (id) => (await db.query('DELETE FROM zones WHERE id = $1 RETURNING id', [id])).rows[0] ?? null

module.exports = { lister, parId, creer, modifier, supprimer }

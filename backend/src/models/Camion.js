// Flotte de camions (position GPS PostGIS, chauffeur affecté)
const db = require('../config/db')

const CHAMPS = `c.id, c.immatriculation, c.modele, c.capacite_kg::float AS capacite_kg, c.statut, c.chauffeur_id,
  c.derniere_maintenance, c.created_at,
  ST_Y(c.position_actuelle::geometry) AS latitude, ST_X(c.position_actuelle::geometry) AS longitude,
  u.prenom || ' ' || u.nom AS chauffeur_nom`

async function lister({ statut } = {}) {
  const params = []
  const where = statut ? `WHERE c.statut = $${params.push(statut)}` : ''
  const { rows } = await db.query(`SELECT ${CHAMPS} FROM camions c LEFT JOIN utilisateurs u ON u.id = c.chauffeur_id ${where} ORDER BY c.immatriculation`, params)
  return rows
}

async function parId(id) {
  const { rows } = await db.query(`SELECT ${CHAMPS} FROM camions c LEFT JOIN utilisateurs u ON u.id = c.chauffeur_id WHERE c.id = $1`, [id])
  return rows[0] ?? null
}

// Affectation d'un chauffeur : tenue à jour des deux côtés (camions.chauffeur_id et chauffeurs.camion_id)
async function affecterChauffeur(tx, camionId, chauffeurId) {
  await tx.query('UPDATE chauffeurs SET camion_id = NULL WHERE camion_id = $1', [camionId])
  await tx.query('UPDATE camions SET chauffeur_id = NULL WHERE chauffeur_id = $1 AND id <> $2', [chauffeurId, camionId])
  await tx.query('UPDATE camions SET chauffeur_id = $2 WHERE id = $1', [camionId, chauffeurId])
  if (chauffeurId) await tx.query('UPDATE chauffeurs SET camion_id = $1 WHERE id = $2', [camionId, chauffeurId])
}

async function creer({ immatriculation, modele, capacite_kg, chauffeur_id, latitude, longitude }) {
  const id = await db.transaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO camions (immatriculation, modele, capacite_kg, position_actuelle)
       VALUES ($1, $2, $3, CASE WHEN $4::float IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography END) RETURNING id`,
      [immatriculation.trim().toUpperCase(), modele ?? null, capacite_kg, latitude ?? null, longitude ?? null],
    )
    if (chauffeur_id) await affecterChauffeur(tx, rows[0].id, chauffeur_id)
    return rows[0].id
  })
  return parId(id)
}

async function modifier(id, { immatriculation, modele, capacite_kg, statut, chauffeur_id, derniere_maintenance }) {
  const ok = await db.transaction(async (tx) => {
    const { rows } = await tx.query(
      `UPDATE camions SET immatriculation = COALESCE($2, immatriculation), modele = COALESCE($3, modele),
              capacite_kg = COALESCE($4, capacite_kg), statut = COALESCE($5, statut),
              derniere_maintenance = COALESCE($6, derniere_maintenance)
        WHERE id = $1 RETURNING id`,
      [id, immatriculation?.trim().toUpperCase() ?? null, modele ?? null, capacite_kg ?? null, statut ?? null, derniere_maintenance ?? null],
    )
    if (!rows[0]) return false
    if (chauffeur_id !== undefined) await affecterChauffeur(tx, id, chauffeur_id)
    return true
  })
  return ok ? parId(id) : null
}

const supprimer = async (id) => (await db.query('DELETE FROM camions WHERE id = $1 RETURNING id', [id])).rows[0] ?? null

module.exports = { lister, parId, creer, modifier, supprimer }

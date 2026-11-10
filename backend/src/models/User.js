// Utilisateurs et leurs tables d'héritage (citoyens, agents_municipaux, chauffeurs, administrateurs)
const db = require('../config/db')

const CHAMPS = 'u.id, u.nom, u.prenom, u.email, u.role, u.telephone, u.actif, u.created_at'

async function parEmail(email) {
  const { rows } = await db.query('SELECT * FROM utilisateurs WHERE email = $1', [email.trim().toLowerCase()])
  return rows[0] ?? null
}

// Profil complet : champs propres au rôle inclus (points éco, zone, camion…)
async function profil(id) {
  const { rows } = await db.query(
    `SELECT ${CHAMPS},
            c.quartier, c.points_eco,
            a.matricule, a.zone_id, z.nom AS zone_nom,
            ch.numero_permis, ch.camion_id, cam.immatriculation AS camion_immatriculation,
            ad.niveau
       FROM utilisateurs u
       LEFT JOIN citoyens c ON c.id = u.id
       LEFT JOIN agents_municipaux a ON a.id = u.id
       LEFT JOIN zones z ON z.id = a.zone_id
       LEFT JOIN chauffeurs ch ON ch.id = u.id
       LEFT JOIN camions cam ON cam.id = ch.camion_id
       LEFT JOIN administrateurs ad ON ad.id = u.id
      WHERE u.id = $1`,
    [id],
  )
  return rows[0] ?? null
}

// Création dans une transaction : la ligne « utilisateurs » et celle de son rôle, ou rien
async function creer({ nom, prenom, email, motDePasseHash, role, telephone, extras = {} }) {
  return db.transaction(async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe, role, telephone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nom, prenom, email, role, telephone, actif, created_at`,
      [nom.trim(), prenom.trim(), email.trim().toLowerCase(), motDePasseHash, role, telephone ?? null],
    )
    const u = rows[0]
    if (role === 'citoyen') await tx.query('INSERT INTO citoyens (id, quartier) VALUES ($1, $2)', [u.id, extras.quartier ?? null])
    if (role === 'agent_municipal')
      await tx.query('INSERT INTO agents_municipaux (id, matricule, zone_id) VALUES ($1, $2, $3)', [u.id, extras.matricule, extras.zone_id ?? null])
    if (role === 'chauffeur')
      await tx.query('INSERT INTO chauffeurs (id, numero_permis, camion_id) VALUES ($1, $2, $3)', [u.id, extras.numero_permis, extras.camion_id ?? null])
    if (role === 'administrateur') await tx.query('INSERT INTO administrateurs (id, niveau) VALUES ($1, $2)', [u.id, extras.niveau ?? 1])
    return u
  })
}

async function lister({ role, recherche, limit, offset }) {
  const conditions = []
  const params = []
  if (role) conditions.push(`u.role = $${params.push(role)}`)
  if (recherche) conditions.push(`(u.nom || ' ' || u.prenom || ' ' || u.email) ILIKE $${params.push(`%${recherche}%`)}`)
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const total = (await db.query(`SELECT count(*)::int AS n FROM utilisateurs u ${where}`, params)).rows[0].n
  const { rows } = await db.query(
    `SELECT ${CHAMPS}, c.points_eco, a.matricule, ch.numero_permis
       FROM utilisateurs u
       LEFT JOIN citoyens c ON c.id = u.id
       LEFT JOIN agents_municipaux a ON a.id = u.id
       LEFT JOIN chauffeurs ch ON ch.id = u.id
       ${where} ORDER BY u.created_at DESC LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
    params,
  )
  return { utilisateurs: rows, total }
}

async function modifier(id, { nom, prenom, telephone }) {
  const { rows } = await db.query(
    `UPDATE utilisateurs SET nom = COALESCE($2, nom), prenom = COALESCE($3, prenom), telephone = COALESCE($4, telephone)
      WHERE id = $1 RETURNING id, nom, prenom, email, role, telephone, actif`,
    [id, nom ?? null, prenom ?? null, telephone ?? null],
  )
  return rows[0] ?? null
}

async function activer(id, actif) {
  const { rows } = await db.query('UPDATE utilisateurs SET actif = $2 WHERE id = $1 RETURNING id, email, role, actif', [id, actif])
  return rows[0] ?? null
}

async function ajouterPointsEco(citoyenId, points, executer = db) {
  await executer.query('UPDATE citoyens SET points_eco = points_eco + $2 WHERE id = $1', [citoyenId, points])
}

module.exports = { parEmail, profil, creer, lister, modifier, activer, ajouterPointsEco }

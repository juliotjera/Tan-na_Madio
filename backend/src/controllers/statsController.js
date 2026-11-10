// Statistiques : tableau de bord, par zone, par période
const db = require('../config/db')
const { ErreurApi, asyncHandler } = require('../utils/helpers')

const arrondi = (x, n = 1) => (x == null ? null : Math.round(Number(x) * 10 ** n) / 10 ** n)

const dashboard = asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      (SELECT count(*) FROM signalements)::int AS signalements,
      (SELECT count(*) FROM signalements WHERE statut = 'en_attente')::int AS en_attente,
      (SELECT count(*) FROM signalements WHERE statut = 'valide')::int AS valides,
      (SELECT count(*) FROM signalements WHERE statut = 'en_cours')::int AS en_cours,
      (SELECT count(*) FROM signalements WHERE statut = 'collecte')::int AS collectes_signalements,
      (SELECT count(*) FROM signalements WHERE statut = 'rejete')::int AS rejetes,
      (SELECT count(*) FROM signalements WHERE urgence = 'critique' AND statut IN ('en_attente', 'valide'))::int AS critiques_ouverts,
      (SELECT count(*) FROM utilisateurs)::int AS utilisateurs,
      (SELECT count(*) FROM camions)::int AS camions,
      (SELECT count(*) FROM camions WHERE statut = 'disponible')::int AS camions_disponibles,
      (SELECT count(*) FROM collectes)::int AS collectes,
      (SELECT count(*) FROM collectes WHERE statut = 'terminee')::int AS collectes_terminees,
      (SELECT COALESCE(sum(poids_collecte_kg), 0) FROM collectes WHERE statut = 'terminee')::float AS poids_total_kg,
      (SELECT COALESCE(sum(distance_km), 0) FROM collectes WHERE statut = 'terminee')::float AS distance_totale_km,
      (SELECT avg(EXTRACT(EPOCH FROM (date_validation - created_at)) / 3600) FROM signalements WHERE date_validation IS NOT NULL)::float AS delai_moyen_heures
  `)
  const s = rows[0]
  // taux de réussite : part des signalements traités (non rejetés) qui ont été effectivement collectés
  const traites = s.signalements - s.rejetes
  res.json({
    ...s,
    taux_reussite: traites > 0 ? arrondi((s.collectes_signalements / traites) * 100) : 0,
    delai_moyen_heures: arrondi(s.delai_moyen_heures),
  })
})

const zones = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, nom, total_signalements::int, en_attente::int, collectes::int, urgents::int, delai_moyen_heures::float
       FROM statistiques_zones ORDER BY total_signalements DESC, nom`,
  )
  res.json({ zones: rows.map((z) => ({ ...z, delai_moyen_heures: arrondi(z.delai_moyen_heures) })) })
})

// Évolution jour par jour (ou semaine par semaine au-delà de 90 jours) entre deux dates
const periode = asyncHandler(async (req, res) => {
  const fin = req.query.fin ? new Date(req.query.fin) : new Date()
  const debut = req.query.debut ? new Date(req.query.debut) : new Date(fin.getTime() - 30 * 86400000)
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime()) || debut > fin) throw new ErreurApi(400, 'Période invalide', 'PERIODE_INVALIDE')
  const pas = fin - debut > 90 * 86400000 ? 'week' : 'day'
  const { rows } = await db.query(
    `WITH jours AS (SELECT generate_series(date_trunc($3, $1::timestamptz), date_trunc($3, $2::timestamptz), ('1 ' || $3)::interval) AS jour)
     SELECT to_char(j.jour, 'YYYY-MM-DD') AS date,
            (SELECT count(*) FROM signalements s WHERE date_trunc($3, s.created_at) = j.jour)::int AS signalements,
            (SELECT count(*) FROM collecte_signalements cs JOIN collectes c ON c.id = cs.collecte_id
              WHERE cs.collecte_fait AND date_trunc($3, c.date_fin) = j.jour)::int AS collectes,
            (SELECT COALESCE(sum(poids_collecte_kg), 0) FROM collectes c WHERE c.statut = 'terminee' AND date_trunc($3, c.date_fin) = j.jour)::float AS poids_kg
       FROM jours j ORDER BY j.jour`,
    [debut.toISOString(), fin.toISOString(), pas],
  )
  const urgences = await db.query(
    `SELECT urgence, count(*)::int AS total FROM signalements WHERE created_at BETWEEN $1 AND $2 GROUP BY urgence`,
    [debut.toISOString(), fin.toISOString()],
  )
  res.json({ debut: debut.toISOString(), fin: fin.toISOString(), pas: pas === 'day' ? 'jour' : 'semaine', series: rows, par_urgence: urgences.rows })
})

// Aperçu public (page d'accueil) : chiffres globaux et points anonymes, sans nom ni description
const apercu = asyncHandler(async (req, res) => {
  const chiffres = (
    await db.query(`
      SELECT (SELECT count(*) FROM signalements)::int AS signalements,
             (SELECT count(*) FROM signalements WHERE statut = 'collecte')::int AS collectes,
             (SELECT count(*) FROM zones WHERE actif)::int AS zones,
             (SELECT count(*) FROM utilisateurs WHERE role = 'citoyen' AND actif)::int AS citoyens,
             (SELECT COALESCE(sum(poids_collecte_kg), 0) FROM collectes WHERE statut = 'terminee')::float AS poids_total_kg`)
  ).rows[0]
  const points = (
    await db.query(`SELECT statut, urgence, round(latitude::numeric, 4)::float AS latitude, round(longitude::numeric, 4)::float AS longitude
                      FROM signalements_carte ORDER BY created_at DESC LIMIT 200`)
  ).rows
  const tournee = (
    await db.query(`SELECT itineraire->'trace' AS trace, itineraire->'trace_naive' AS trace_naive, distance_km::float,
                           (itineraire->>'distance_naive_km')::float AS distance_naive_km, (itineraire->>'gain_pourcent')::float AS gain_pourcent
                      FROM collectes WHERE itineraire ? 'trace' ORDER BY (itineraire->>'gain_pourcent')::float DESC NULLS LAST LIMIT 1`)
  ).rows[0] ?? null
  res.set('Cache-Control', 'public, max-age=60')
  res.json({ ...chiffres, points, tournee })
})

module.exports = { dashboard, zones, periode, apercu }

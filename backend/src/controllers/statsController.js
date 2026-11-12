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
  // tendances : signalements du mois en cours face au mois précédent, et 14 derniers jours (mini-graphique)
  const tendance = (
    await db.query(`
      SELECT (SELECT count(*) FROM signalements WHERE created_at >= date_trunc('month', NOW()))::int AS mois,
             (SELECT count(*) FROM signalements WHERE created_at >= date_trunc('month', NOW()) - interval '1 month'
                                                 AND created_at < date_trunc('month', NOW()))::int AS mois_precedent`)
  ).rows[0]
  const serie = (
    await db.query(`
      SELECT to_char(j, 'YYYY-MM-DD') AS date, (SELECT count(*) FROM signalements WHERE date_trunc('day', created_at) = j)::int AS n
        FROM generate_series(date_trunc('day', NOW()) - interval '13 days', date_trunc('day', NOW()), interval '1 day') AS j ORDER BY j`)
  ).rows
  const evolution = tendance.mois_precedent > 0 ? arrondi(((tendance.mois - tendance.mois_precedent) / tendance.mois_precedent) * 100) : null
  // taux de réussite : part des signalements traités (non rejetés) qui ont été effectivement collectés
  const traites = s.signalements - s.rejetes
  res.json({
    ...s,
    taux_reussite: traites > 0 ? arrondi((s.collectes_signalements / traites) * 100) : 0,
    delai_moyen_heures: arrondi(s.delai_moyen_heures),
    signalements_mois: tendance.mois,
    evolution_signalements_pct: evolution,
    serie_14_jours: serie,
  })
})

// Classement des citoyens les plus actifs (prénom et initiale seulement : pas de nom complet exposé)
const topCitoyens = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.prenom || ' ' || left(u.nom, 1) || '.' AS nom, c.quartier, c.points_eco,
            (SELECT count(*) FROM signalements s WHERE s.citoyen_id = u.id)::int AS signalements
       FROM citoyens c JOIN utilisateurs u ON u.id = c.id
      WHERE u.actif AND c.points_eco > 0
      ORDER BY c.points_eco DESC, u.created_at LIMIT 5`,
  )
  res.json({ citoyens: rows.map((c) => ({ ...c, moi: c.id === req.user.id, id: undefined })) })
})

// Performance par camion : tournées, points planifiés et ramassés, efficacité, kilomètres
const camions = asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT ca.id, ca.immatriculation, ca.modele, ca.statut,
           count(DISTINCT co.id)::int AS collectes,
           count(DISTINCT co.id) FILTER (WHERE co.statut = 'terminee')::int AS terminees,
           count(cs.signalement_id)::int AS points_planifies,
           count(cs.signalement_id) FILTER (WHERE cs.collecte_fait)::int AS points_collectes,
           (SELECT COALESCE(sum(distance_km), 0) FROM collectes WHERE camion_id = ca.id AND statut = 'terminee')::float AS km,
           (SELECT COALESCE(sum(poids_collecte_kg), 0) FROM collectes WHERE camion_id = ca.id AND statut = 'terminee')::float AS kg
      FROM camions ca
      LEFT JOIN collectes co ON co.camion_id = ca.id AND co.statut <> 'annulee'
      LEFT JOIN collecte_signalements cs ON cs.collecte_id = co.id
     GROUP BY ca.id ORDER BY collectes DESC, ca.immatriculation`)
  res.json({
    camions: rows.map((c) => ({ ...c, efficacite_pct: c.points_planifies ? Math.round((c.points_collectes / c.points_planifies) * 100) : 0 })),
  })
})

// Par zone : volumes, délai moyen, et suivi de la fréquence de passage prévue :
// une zone est « en retard » si des dépôts validés y attendent et que le dernier ramassage
// date de plus longtemps que sa fréquence de collecte
const zones = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT sz.id, sz.nom, sz.total_signalements::int, sz.en_attente::int, sz.collectes::int, sz.urgents::int, sz.delai_moyen_heures::float,
            z.frequence_collecte_jours, z.actif,
            (SELECT count(*) FROM signalements s WHERE s.zone_id = sz.id AND s.statut = 'valide')::int AS a_planifier,
            (SELECT max(c.date_fin) FROM collectes c
               JOIN collecte_signalements cs ON cs.collecte_id = c.id
               JOIN signalements s ON s.id = cs.signalement_id
              WHERE s.zone_id = sz.id AND c.statut = 'terminee' AND cs.collecte_fait) AS derniere_collecte
       FROM statistiques_zones sz JOIN zones z ON z.id = sz.id
      ORDER BY sz.total_signalements DESC, sz.nom`,
  )
  const maintenant = Date.now()
  res.json({
    zones: rows.map((z) => {
      const jours = z.derniere_collecte ? Math.floor((maintenant - new Date(z.derniere_collecte)) / 86400000) : null
      const frequence = z.frequence_collecte_jours ?? 7
      return {
        ...z,
        delai_moyen_heures: arrondi(z.delai_moyen_heures),
        jours_depuis_collecte: jours,
        en_retard: z.actif && z.a_planifier > 0 && (jours === null || jours > frequence),
      }
    }),
  })
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

// Points noirs : les signalements regroupés sur une grille d'environ 200 m (PostGIS ST_SnapToGrid),
// pour repérer les lieux où les dépôts reviennent et y placer un bac ou une campagne de sensibilisation
const pointsNoirs = asyncHandler(async (req, res) => {
  const jours = Math.min(365, Math.max(7, Number(req.query.jours) || 90))
  const { rows } = await db.query(
    `SELECT ST_Y(ST_Centroid(ST_Collect(s.localisation::geometry))) AS latitude,
            ST_X(ST_Centroid(ST_Collect(s.localisation::geometry))) AS longitude,
            count(*)::int AS total,
            count(*) FILTER (WHERE s.statut IN ('en_attente', 'valide', 'en_cours'))::int AS ouverts,
            count(*) FILTER (WHERE s.urgence IN ('eleve', 'critique'))::int AS urgents,
            mode() WITHIN GROUP (ORDER BY z.nom) AS zone_nom,
            max(s.created_at) AS dernier
       FROM signalements s LEFT JOIN zones z ON z.id = s.zone_id
      WHERE s.statut != 'rejete' AND s.created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY ST_SnapToGrid(s.localisation::geometry, 0.002)
      HAVING count(*) >= 2
      ORDER BY total DESC, ouverts DESC
      LIMIT 30`,
    [String(jours)],
  )
  res.json({ jours, points: rows.map((p) => ({ ...p, latitude: Number(p.latitude), longitude: Number(p.longitude) })) })
})

module.exports = { dashboard, zones, periode, apercu, topCitoyens, camions, pointsNoirs }

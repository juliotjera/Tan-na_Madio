// Collectes : optimisation (Dijkstra + glouton), planification, déroulement de la tournée
const db = require('../config/db')
const { Collecte, User, Notification, journaliser } = require('../models')
const collecteService = require('../services/collecteService')
const { selectionnerPourCamion, POIDS_ESTIME_KG } = require('../algorithms/glouton')
const { ErreurApi, asyncHandler, pagination, estUuid, POINTS_ECO, dateLocale } = require('../utils/helpers')

const STATUTS = ['planifiee', 'en_cours', 'terminee', 'annulee']

async function charger(id, executer) {
  const c = await Collecte.parId(id, executer)
  if (!c) throw new ErreurApi(404, 'Collecte introuvable', 'COLLECTE_INTROUVABLE')
  return c
}

// Le chauffeur n'agit que sur les tournées du camion qui lui est affecté
function verifierChauffeur(req, collecte) {
  if (req.user.role === 'chauffeur' && collecte.chauffeur_id !== req.user.id) {
    throw new ErreurApi(403, "Cette tournée n'est pas affectée à votre camion", 'TOURNEE_NON_AFFECTEE')
  }
}

function exigerStatut(collecte, ...attendus) {
  if (!attendus.includes(collecte.statut)) {
    throw new ErreurApi(422, `Action impossible : la collecte est « ${collecte.statut} »`, 'STATUT_COLLECTE_INVALIDE')
  }
}

const lister = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query)
  if (req.query.statut && !STATUTS.includes(req.query.statut)) throw new ErreurApi(400, 'Valeur de statut inconnue', 'FILTRE_INVALIDE')
  const resultat = await Collecte.lister({
    statut: req.query.statut || undefined,
    camion_id: req.query.camion_id || undefined,
    zone_id: req.query.zone_id || undefined,
    chauffeur_id: req.user.role === 'chauffeur' ? req.user.id : undefined,
    limit,
    offset,
  })
  res.json({ ...resultat, page, limit })
})

const detail = asyncHandler(async (req, res) => {
  const c = await charger(req.params.id)
  verifierChauffeur(req, c)
  res.json(c)
})

// Calcul seul, rien n'est enregistré : l'agent voit l'itinéraire avant de confirmer
const optimiser = asyncHandler(async (req, res) => {
  res.json(await collecteService.optimiser(req.body))
})

// Sélection automatique (glouton) : les signalements validés les plus urgents, sans dépasser la capacité du camion
const suggestion = asyncHandler(async (req, res) => {
  const { camion_id, zone_id } = req.body
  if (!estUuid(camion_id)) throw new ErreurApi(400, 'Choisissez un camion', 'CAMION_REQUIS')
  const camion = (await db.query('SELECT capacite_kg::float AS capacite_kg FROM camions WHERE id = $1', [camion_id])).rows[0]
  if (!camion) throw new ErreurApi(404, 'Camion introuvable', 'CAMION_INTROUVABLE')
  const params = []
  const filtreZone = estUuid(zone_id) ? `AND zone_id = $${params.push(zone_id)}` : ''
  const { rows } = await db.query(`SELECT id, urgence, created_at FROM signalements WHERE statut = 'valide' ${filtreZone}`, params)
  const { retenus, charge_estimee_kg } = selectionnerPourCamion(rows, camion.capacite_kg)
  res.json({
    signalement_ids: retenus.map((s) => s.id),
    charge_estimee_kg,
    capacite_kg: camion.capacite_kg,
    non_retenus: rows.length - retenus.length,
    poids_estimes_kg: POIDS_ESTIME_KG,
  })
})

const creer = asyncHandler(async (req, res) => {
  const { camion_id, zone_id, date_planifiee, signalement_ids, notes } = req.body
  if (!estUuid(camion_id)) throw new ErreurApi(400, 'Choisissez un camion', 'CAMION_REQUIS')
  const date = new Date(date_planifiee)
  if (Number.isNaN(date.getTime())) throw new ErreurApi(400, 'Date planifiée invalide', 'DATE_INVALIDE')

  // l'itinéraire est recalculé côté serveur : on n'enregistre jamais un tracé fourni par le client
  const plan = await collecteService.optimiser({ signalement_ids, camion_id })

  const id = await db.transaction(async (tx) => {
    const camion = (await tx.query('SELECT statut FROM camions WHERE id = $1 FOR UPDATE', [camion_id])).rows[0]
    if (!camion) throw new ErreurApi(404, 'Camion introuvable', 'CAMION_INTROUVABLE')
    if (camion.statut !== 'disponible') throw new ErreurApi(422, "Ce camion n'est pas disponible", 'CAMION_INDISPONIBLE')

    const { rows } = await tx.query(
      `INSERT INTO collectes (camion_id, agent_id, zone_id, date_planifiee, itineraire, distance_km, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [camion_id, req.user.id, zone_id || null, date.toISOString(), JSON.stringify(plan), plan.distance_km, notes?.trim() || null],
    )
    const collecteId = rows[0].id
    for (const [i, sid] of plan.ordre_optimal.entries()) {
      await tx.query('INSERT INTO collecte_signalements (collecte_id, signalement_id, ordre) VALUES ($1, $2, $3)', [collecteId, sid, i + 1])
    }
    // un signalement ne peut être dans deux tournées : seuls les « valide » passent en_cours
    const maj = await tx.query(`UPDATE signalements SET statut = 'en_cours' WHERE id = ANY($1::uuid[]) AND statut = 'valide'`, [plan.ordre_optimal])
    if (maj.rowCount !== plan.ordre_optimal.length) throw new ErreurApi(409, 'Un signalement vient d’être planifié ailleurs', 'SIGNALEMENT_DEJA_PLANIFIE')
    await tx.query(`UPDATE camions SET statut = 'en_tournee' WHERE id = $1`, [camion_id])
    return collecteId
  })
  await journaliser(req, 'creation', 'collecte', id, { camion_id, nb_points: plan.ordre_optimal.length, distance_km: plan.distance_km })
  const cree = await charger(id)
  const quand = dateLocale(cree.date_planifiee)
  await Notification.notifier(cree.chauffeur_id, {
    type: 'tournee_affectee',
    titre: `Nouvelle tournée ${quand}`,
    message: `${cree.nb_points} arrêts, ${cree.distance_km} km avec le camion ${cree.camion_immatriculation}.`,
    lien: `/chauffeur/tournees/${id}`,
  })
  await Notification.notifier(
    cree.signalements.map((s) => s.citoyen_id),
    { type: 'signalement_planifie', titre: 'Votre signalement est programmé', message: `Passage du camion prévu ${quand}.`, lien: '/citoyen/signalements' },
  )
  res.status(201).json(cree)
})

const demarrer = asyncHandler(async (req, res) => {
  const c = await charger(req.params.id)
  verifierChauffeur(req, c)
  exigerStatut(c, 'planifiee')
  await db.query(`UPDATE collectes SET statut = 'en_cours', date_debut = NOW() WHERE id = $1`, [c.id])
  await journaliser(req, 'demarrage', 'collecte', c.id)
  res.json(await charger(c.id))
})

// Un point ramassé : +10 points éco pour le citoyen qui l'a signalé
const marquerPoint = asyncHandler(async (req, res) => {
  const c = await charger(req.params.id)
  verifierChauffeur(req, c)
  exigerStatut(c, 'en_cours')
  const point = c.signalements.find((s) => s.id === req.params.sid)
  if (!point) throw new ErreurApi(404, "Ce point ne fait pas partie de la tournée", 'POINT_INTROUVABLE')
  if (point.collecte_fait) throw new ErreurApi(409, 'Point déjà collecté', 'POINT_DEJA_COLLECTE')

  await db.transaction(async (tx) => {
    await tx.query('UPDATE collecte_signalements SET collecte_fait = TRUE WHERE collecte_id = $1 AND signalement_id = $2', [c.id, point.id])
    await tx.query(`UPDATE signalements SET statut = 'collecte' WHERE id = $1`, [point.id])
    await tx.query('UPDATE collectes SET nb_signalements_traites = nb_signalements_traites + 1 WHERE id = $1', [c.id])
    await User.ajouterPointsEco(point.citoyen_id, POINTS_ECO.collecte, tx)
  })
  await journaliser(req, 'point_collecte', 'collecte', c.id, { signalement_id: point.id })
  await Notification.notifier(point.citoyen_id, {
    type: 'signalement_collecte',
    titre: `Dépôt ramassé : +${POINTS_ECO.collecte} points`,
    message: `${point.description ?? point.adresse ?? 'Le dépôt que vous avez signalé'}. Merci pour votre signalement.`,
    lien: '/citoyen/signalements',
  })
  res.json(await charger(c.id))
})

// Fin de tournée : les points non ramassés redeviennent « valide » pour une prochaine tournée
const terminer = asyncHandler(async (req, res) => {
  const c = await charger(req.params.id)
  verifierChauffeur(req, c)
  exigerStatut(c, 'en_cours')
  const poids = req.body.poids_collecte_kg == null ? null : Number(req.body.poids_collecte_kg)
  const distance = req.body.distance_km == null ? null : Number(req.body.distance_km)
  if ((poids != null && !(poids >= 0)) || (distance != null && !(distance >= 0))) throw new ErreurApi(400, 'Poids ou distance invalide', 'VALEUR_INVALIDE')

  await db.transaction(async (tx) => {
    await tx.query(
      `UPDATE collectes SET statut = 'terminee', date_fin = NOW(), poids_collecte_kg = $2, distance_km = COALESCE($3, distance_km) WHERE id = $1`,
      [c.id, poids, distance],
    )
    await tx.query(
      `UPDATE signalements SET statut = 'valide'
        WHERE statut = 'en_cours' AND id IN (SELECT signalement_id FROM collecte_signalements WHERE collecte_id = $1 AND NOT collecte_fait)`,
      [c.id],
    )
    await tx.query(`UPDATE camions SET statut = 'disponible' WHERE id = $1 AND statut = 'en_tournee'`, [c.camion_id])
  })
  await journaliser(req, 'fin', 'collecte', c.id, { poids_collecte_kg: poids, points_collectes: c.nb_faits })
  await Notification.notifier(c.agent_id, {
    type: 'tournee_terminee',
    titre: `Tournée terminée : ${c.nb_faits}/${c.nb_points} arrêts`,
    message: `Camion ${c.camion_immatriculation}${poids != null ? `, ${poids} kg collectés` : ''}.`,
    lien: '/agent/collectes',
  })
  res.json(await charger(c.id))
})

const annuler = asyncHandler(async (req, res) => {
  const c = await charger(req.params.id)
  exigerStatut(c, 'planifiee')
  await db.transaction(async (tx) => {
    await tx.query(`UPDATE collectes SET statut = 'annulee' WHERE id = $1`, [c.id])
    await tx.query(
      `UPDATE signalements SET statut = 'valide'
        WHERE statut = 'en_cours' AND id IN (SELECT signalement_id FROM collecte_signalements WHERE collecte_id = $1)`,
      [c.id],
    )
    await tx.query(`UPDATE camions SET statut = 'disponible' WHERE id = $1 AND statut = 'en_tournee'`, [c.camion_id])
  })
  await journaliser(req, 'annulation', 'collecte', c.id)
  await Notification.notifier(c.chauffeur_id, {
    type: 'tournee_annulee',
    titre: 'Tournée annulée',
    message: `La tournée prévue ${dateLocale(c.date_planifiee)} est annulée.`,
    lien: '/chauffeur',
  })
  res.json(await charger(c.id))
})

module.exports = { lister, detail, optimiser, suggestion, creer, demarrer, marquerPoint, terminer, annuler }

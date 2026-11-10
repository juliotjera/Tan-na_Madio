// Flotte de camions (gestion par l'administrateur, consultation par les agents)
const db = require('../config/db')
const { Camion, journaliser } = require('../models')
const { ErreurApi, asyncHandler, estUuid } = require('../utils/helpers')
const { latitudeValide, longitudeValide } = require('../utils/geoUtils')

const STATUTS = ['disponible', 'en_tournee', 'en_maintenance', 'hors_service']

async function verifierChauffeur(id) {
  if (id == null) return
  if (!estUuid(id)) throw new ErreurApi(400, 'Chauffeur invalide', 'ID_INVALIDE')
  const { rows } = await db.query('SELECT 1 FROM chauffeurs WHERE id = $1', [id])
  if (!rows[0]) throw new ErreurApi(422, "Cet utilisateur n'est pas chauffeur", 'CHAUFFEUR_INVALIDE')
}

function verifierChamps({ capacite_kg, statut, latitude, longitude }, creation) {
  if ((creation || capacite_kg !== undefined) && !(Number(capacite_kg) > 0)) throw new ErreurApi(400, 'La capacité doit être positive', 'CAPACITE_INVALIDE')
  if (statut !== undefined && !STATUTS.includes(statut)) throw new ErreurApi(400, 'Statut de camion inconnu', 'STATUT_INVALIDE')
  if (latitude != null && (!latitudeValide(Number(latitude)) || !longitudeValide(Number(longitude)))) throw new ErreurApi(400, 'Position GPS invalide', 'GPS_INVALIDE')
}

const lister = asyncHandler(async (req, res) => {
  if (req.query.statut && !STATUTS.includes(req.query.statut)) throw new ErreurApi(400, 'Statut de camion inconnu', 'FILTRE_INVALIDE')
  res.json({ camions: await Camion.lister({ statut: req.query.statut }) })
})

const detail = asyncHandler(async (req, res) => {
  const c = await Camion.parId(req.params.id)
  if (!c) throw new ErreurApi(404, 'Camion introuvable', 'CAMION_INTROUVABLE')
  res.json(c)
})

const creer = asyncHandler(async (req, res) => {
  if (!req.body.immatriculation?.trim()) throw new ErreurApi(400, "L'immatriculation est obligatoire", 'CHAMPS_MANQUANTS')
  verifierChamps(req.body, true)
  await verifierChauffeur(req.body.chauffeur_id)
  const c = await Camion.creer({ ...req.body, capacite_kg: Number(req.body.capacite_kg) })
  await journaliser(req, 'creation', 'camion', c.id, { immatriculation: c.immatriculation })
  res.status(201).json(c)
})

const modifier = asyncHandler(async (req, res) => {
  verifierChamps(req.body, false)
  if (req.body.chauffeur_id !== undefined) await verifierChauffeur(req.body.chauffeur_id)
  const actuel = await Camion.parId(req.params.id)
  if (!actuel) throw new ErreurApi(404, 'Camion introuvable', 'CAMION_INTROUVABLE')
  // le statut « en_tournee » est piloté par les collectes, pas à la main
  if (req.body.statut && (req.body.statut === 'en_tournee') !== (actuel.statut === 'en_tournee')) {
    throw new ErreurApi(422, 'Le statut « en tournée » est géré par les collectes', 'STATUT_GERE_PAR_COLLECTE')
  }
  const c = await Camion.modifier(req.params.id, { ...req.body, capacite_kg: req.body.capacite_kg === undefined ? undefined : Number(req.body.capacite_kg) })
  await journaliser(req, 'modification', 'camion', c.id)
  res.json(c)
})

const supprimer = asyncHandler(async (req, res) => {
  const c = await Camion.parId(req.params.id)
  if (!c) throw new ErreurApi(404, 'Camion introuvable', 'CAMION_INTROUVABLE')
  if (c.statut === 'en_tournee') throw new ErreurApi(422, 'Impossible de supprimer un camion en tournée', 'CAMION_EN_TOURNEE')
  const { rows } = await db.query('SELECT count(*)::int AS n FROM collectes WHERE camion_id = $1', [c.id])
  if (rows[0].n > 0) throw new ErreurApi(422, 'Ce camion a un historique de collectes : passez-le plutôt « hors service »', 'CAMION_AVEC_HISTORIQUE')
  await Camion.supprimer(c.id)
  await journaliser(req, 'suppression', 'camion', c.id, { immatriculation: c.immatriculation })
  res.json({ message: 'Camion supprimé' })
})

module.exports = { lister, detail, creer, modifier, supprimer }

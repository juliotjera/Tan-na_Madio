// Zones de collecte (Analakely, Isotry…)
const { Zone, journaliser } = require('../models')
const { ErreurApi, asyncHandler } = require('../utils/helpers')
const { latitudeValide, longitudeValide } = require('../utils/geoUtils')

function verifier({ nom, frequence_collecte_jours, points }, creation) {
  if (creation && !nom?.trim()) throw new ErreurApi(400, 'Le nom de la zone est obligatoire', 'CHAMPS_MANQUANTS')
  if (frequence_collecte_jours != null && !(Number.isInteger(Number(frequence_collecte_jours)) && Number(frequence_collecte_jours) >= 1)) {
    throw new ErreurApi(400, 'La fréquence est un nombre de jours (1 ou plus)', 'FREQUENCE_INVALIDE')
  }
  if (points != null) {
    const ok = Array.isArray(points) && points.length >= 3 && points.every((p) => Array.isArray(p) && latitudeValide(p[0]) && longitudeValide(p[1]))
    if (!ok) throw new ErreurApi(400, 'Le contour doit compter au moins 3 points [latitude, longitude]', 'CONTOUR_INVALIDE')
  }
}

const lister = asyncHandler(async (req, res) => {
  res.json({ zones: await Zone.lister() })
})

const detail = asyncHandler(async (req, res) => {
  const z = await Zone.parId(req.params.id)
  if (!z) throw new ErreurApi(404, 'Zone introuvable', 'ZONE_INTROUVABLE')
  res.json(z)
})

const creer = asyncHandler(async (req, res) => {
  verifier(req.body, true)
  const z = await Zone.creer({ ...req.body, nom: req.body.nom.trim() })
  await journaliser(req, 'creation', 'zone', z.id, { nom: z.nom })
  res.status(201).json(z)
})

const modifier = asyncHandler(async (req, res) => {
  verifier(req.body, false)
  const z = await Zone.modifier(req.params.id, req.body)
  if (!z) throw new ErreurApi(404, 'Zone introuvable', 'ZONE_INTROUVABLE')
  await journaliser(req, 'modification', 'zone', z.id)
  res.json(z)
})

// Les signalements et collectes de la zone sont conservés (zone_id passe à NULL)
const supprimer = asyncHandler(async (req, res) => {
  const z = await Zone.supprimer(req.params.id)
  if (!z) throw new ErreurApi(404, 'Zone introuvable', 'ZONE_INTROUVABLE')
  await journaliser(req, 'suppression', 'zone', z.id)
  res.json({ message: 'Zone supprimée' })
})

module.exports = { lister, detail, creer, modifier, supprimer }

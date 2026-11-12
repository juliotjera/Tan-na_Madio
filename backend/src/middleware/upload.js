// Envoi des photos de signalement (multipart/form-data, champ « photo »)
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const multer = require('multer')
const config = require('../config/env')
const { ErreurApi } = require('../utils/helpers')

const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
fs.mkdirSync(config.upload.dossier, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: config.upload.dossier,
    // nom aléatoire : jamais le nom envoyé par le client (pas de chemin ni d'extension piégée)
    filename: (req, fichier, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TYPES[fichier.mimetype]}`),
  }),
  limits: { fileSize: config.upload.maxMo * 1024 * 1024, files: 1 },
  fileFilter: (req, fichier, cb) =>
    TYPES[fichier.mimetype] ? cb(null, true) : cb(new ErreurApi(400, 'Photo JPEG, PNG ou WebP uniquement', 'PHOTO_INVALIDE')),
})

// URL publique d'un fichier enregistré
const urlPhoto = (fichier) => (fichier ? `/uploads/${path.basename(fichier.path)}` : null)

// Le type annoncé par le navigateur ne prouve rien : on vérifie la signature réelle du fichier
// (premiers octets) et on supprime tout fichier qui n'est pas vraiment une image JPEG, PNG ou WebP
const SIGNATURES = {
  'image/jpeg': (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff,
  'image/png': (o) => o.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (o) => o.subarray(0, 4).toString('latin1') === 'RIFF' && o.subarray(8, 12).toString('latin1') === 'WEBP',
}

async function verifierSignature(req, res, next) {
  if (!req.file) return next()
  try {
    const descripteur = await fs.promises.open(req.file.path, 'r')
    const octets = Buffer.alloc(12)
    await descripteur.read(octets, 0, 12, 0)
    await descripteur.close()
    if (SIGNATURES[req.file.mimetype]?.(octets)) return next()
  } catch {
    /* fichier illisible : traité comme invalide */
  }
  await fs.promises.unlink(req.file.path).catch(() => {})
  next(new ErreurApi(400, 'Le fichier envoyé n’est pas une image JPEG, PNG ou WebP valide', 'PHOTO_INVALIDE'))
}

const charger = upload.single('photo')
const uploadPhoto = (req, res, next) => charger(req, res, (erreur) => (erreur ? next(erreur) : verifierSignature(req, res, next)))

module.exports = { uploadPhoto, urlPhoto }

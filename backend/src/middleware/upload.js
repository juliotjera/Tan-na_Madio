// Envoi des photos de signalement (multipart/form-data, champ « photo ») :
// lecture en mémoire, vérification du contenu réel, puis enregistrement (disque ou base, voir stockagePhotos)
const multer = require('multer')
const config = require('../config/env')
const { ErreurApi } = require('../utils/helpers')
const stockage = require('../services/stockagePhotos')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxMo * 1024 * 1024, files: 1 },
  fileFilter: (req, fichier, cb) =>
    stockage.EXTENSIONS[fichier.mimetype] ? cb(null, true) : cb(new ErreurApi(400, 'Photo JPEG, PNG ou WebP uniquement', 'PHOTO_INVALIDE')),
})

// Le type annoncé par le navigateur ne prouve rien : on vérifie la signature réelle du fichier
// (premiers octets) et on refuse tout fichier qui n'est pas vraiment une image JPEG, PNG ou WebP
const SIGNATURES = {
  'image/jpeg': (o) => o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff,
  'image/png': (o) => o.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (o) => o.subarray(0, 4).toString('latin1') === 'RIFF' && o.subarray(8, 12).toString('latin1') === 'WEBP',
}

async function verifierEtEnregistrer(req, res, next) {
  if (!req.file) return next()
  if (!SIGNATURES[req.file.mimetype]?.(req.file.buffer)) {
    return next(new ErreurApi(400, 'Le fichier envoyé n’est pas une image JPEG, PNG ou WebP valide', 'PHOTO_INVALIDE'))
  }
  try {
    req.photoUrl = await stockage.enregistrer(req.file.buffer, req.file.mimetype)
    next()
  } catch (erreur) {
    next(erreur)
  }
}

const charger = upload.single('photo')
const uploadPhoto = (req, res, next) => charger(req, res, (erreur) => (erreur ? next(erreur) : verifierEtEnregistrer(req, res, next)))

module.exports = { uploadPhoto }

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

module.exports = { uploadPhoto: upload.single('photo'), urlPhoto }

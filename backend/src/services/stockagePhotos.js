// Stockage des photos de signalement, selon PHOTOS_STOCKAGE :
// - disque : fichiers dans UPLOAD_DIR (développement, serveur avec disque permanent)
// - base   : table « photos » de PostgreSQL (hébergement gratuit dont le disque est effacé à chaque redémarrage)
// Dans les deux cas l'adresse publique est /uploads/<nom>, donc rien ne change pour l'interface.
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const config = require('../config/env')
const db = require('../config/db')

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
const enBase = () => config.photos.stockage === 'base'
const nomDepuisUrl = (url) => (url?.startsWith('/uploads/') ? path.basename(url) : null)

// nom aléatoire : jamais le nom envoyé par le client (pas de chemin ni d'extension piégée)
const nomAleatoire = (type) => `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXTENSIONS[type]}`

async function enregistrer(contenu, type, nom = nomAleatoire(type)) {
  if (enBase()) {
    await db.query(
      `INSERT INTO photos (nom, type, contenu, taille) VALUES ($1, $2, $3, $4)
       ON CONFLICT (nom) DO UPDATE SET type = EXCLUDED.type, contenu = EXCLUDED.contenu, taille = EXCLUDED.taille`,
      [nom, type, contenu, contenu.length],
    )
  } else {
    await fs.promises.mkdir(config.upload.dossier, { recursive: true })
    await fs.promises.writeFile(path.join(config.upload.dossier, nom), contenu)
  }
  return `/uploads/${nom}`
}

// Suppression silencieuse : une photo déjà absente n'est pas une erreur
async function supprimer(url) {
  const nom = nomDepuisUrl(url)
  if (!nom) return
  if (enBase()) await db.query('DELETE FROM photos WHERE nom = $1', [nom]).catch(() => {})
  else await fs.promises.unlink(path.join(config.upload.dossier, nom)).catch(() => {})
}

// Lecture d'une photo gardée en base (mode « base ») : { type, contenu } ou null
async function lire(nom) {
  const { rows } = await db.query('SELECT type, contenu FROM photos WHERE nom = $1', [nom])
  return rows[0] ? { type: rows[0].type, contenu: Buffer.from(rows[0].contenu) } : null
}

module.exports = { enregistrer, supprimer, lire, enBase, EXTENSIONS }

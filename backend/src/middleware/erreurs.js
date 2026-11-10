// Gestion centralisée des erreurs : format { message, code } décrit dans API_DOCUMENTATION.md
const multer = require('multer')
const { ErreurApi } = require('../utils/helpers')

const routeIntrouvable = (req, res) => res.status(404).json({ message: 'Route introuvable', code: 'NOT_FOUND' })

function gestionErreurs(erreur, req, res, next) {
  if (erreur instanceof ErreurApi) return res.status(erreur.statut).json({ message: erreur.message, code: erreur.code })
  if (erreur instanceof multer.MulterError) {
    const trop = erreur.code === 'LIMIT_FILE_SIZE'
    return res.status(400).json({ message: trop ? 'Photo trop lourde' : 'Envoi de fichier invalide', code: erreur.code })
  }
  if (erreur.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON mal formé', code: 'JSON_INVALIDE' })
  // contraintes PostgreSQL : doublon, référence inexistante, valeur hors énumération
  if (erreur.code === '23505') return res.status(409).json({ message: 'Cette valeur existe déjà', code: 'CONFLIT' })
  if (erreur.code === '23503') return res.status(422).json({ message: 'Référence inexistante ou encore utilisée', code: 'REFERENCE' })
  if (erreur.code === '22P02') return res.status(400).json({ message: 'Valeur invalide', code: 'VALEUR_INVALIDE' })
  console.error(erreur)
  res.status(500).json({ message: 'Erreur interne du serveur', code: 'ERREUR_SERVEUR' })
}

module.exports = { routeIntrouvable, gestionErreurs }

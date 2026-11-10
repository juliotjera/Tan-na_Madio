// Authentification : vérification du jeton d'accès JWT (en-tête Authorization: Bearer …)
const jwt = require('jsonwebtoken')
const config = require('../config/env')
const db = require('../config/db')
const { ErreurApi } = require('../utils/helpers')

async function authentifier(req, res, next) {
  try {
    const entete = req.headers.authorization ?? ''
    const [type, jeton] = entete.split(' ')
    if (type !== 'Bearer' || !jeton) throw new ErreurApi(401, 'Authentification requise', 'TOKEN_MANQUANT')
    let charge
    try {
      charge = jwt.verify(jeton, config.jwt.secret)
    } catch (e) {
      throw new ErreurApi(401, e.name === 'TokenExpiredError' ? 'Session expirée' : 'Jeton invalide', e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRE' : 'TOKEN_INVALIDE')
    }
    // compte toujours actif ? (un administrateur peut le désactiver à tout moment)
    const { rows } = await db.query('SELECT id, nom, prenom, email, role, actif FROM utilisateurs WHERE id = $1', [charge.id])
    if (!rows[0] || !rows[0].actif) throw new ErreurApi(401, 'Compte désactivé ou supprimé', 'COMPTE_INACTIF')
    req.user = rows[0]
    next()
  } catch (erreur) {
    next(erreur)
  }
}

module.exports = { authentifier }

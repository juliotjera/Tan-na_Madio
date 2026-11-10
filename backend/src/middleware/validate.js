// Contrôle d'accès par rôle (RBAC) et validation simple des données reçues
const { ErreurApi, estUuid } = require('../utils/helpers')

// autoriser('agent_municipal', 'administrateur') : 403 pour les autres rôles
const autoriser =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : next(new ErreurApi(403, 'Accès réservé', 'ROLE_INSUFFISANT'))

// Identifiant d'URL au format UUID (évite une erreur SQL sur un identifiant mal formé)
const uuidParam =
  (...noms) =>
  (req, res, next) => {
    const invalide = noms.find((n) => !estUuid(req.params[n]))
    return invalide ? next(new ErreurApi(400, `Identifiant invalide : ${invalide}`, 'ID_INVALIDE')) : next()
  }

// Champs obligatoires du corps de la requête
const requis =
  (...champs) =>
  (req, res, next) => {
    const manquants = champs.filter((c) => req.body?.[c] === undefined || req.body[c] === null || req.body[c] === '')
    return manquants.length ? next(new ErreurApi(400, `Champs manquants : ${manquants.join(', ')}`, 'CHAMPS_MANQUANTS')) : next()
  }

module.exports = { autoriser, uuidParam, requis }

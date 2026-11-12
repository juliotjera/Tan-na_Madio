// Client HTTP et session.
// - Jeton d'accès (15 min) : gardé en mémoire seulement, jamais dans le stockage du navigateur.
// - Jeton de renouvellement : cookie httpOnly posé par l'API, illisible par un script.
// - Profil (nom, rôle) : gardé dans localStorage pour rouvrir l'application, même hors connexion.
// Au rechargement de la page, un nouveau jeton d'accès est demandé grâce au cookie.
import axios from 'axios'

const CLE = 'tanana-madio-session'
let jeton = null

function lireStockage() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? null
  } catch {
    return null
  }
}

function ecrireStockage(valeur) {
  try {
    if (valeur) localStorage.setItem(CLE, JSON.stringify(valeur))
    else localStorage.removeItem(CLE)
  } catch {
    /* stockage indisponible (navigation privée) */
  }
}

export const session = {
  // { user } ou null
  lire() {
    const s = lireStockage()
    return s?.user ? { user: s.user } : null
  },
  jeton: () => jeton,
  ouvrir({ token, user }) {
    jeton = token
    ecrireStockage({ user })
    window.dispatchEvent(new CustomEvent('session', { detail: { user } }))
  },
  majUser(champs) {
    const s = lireStockage()
    if (!s?.user) return
    const user = { ...s.user, ...champs }
    ecrireStockage({ user })
    window.dispatchEvent(new CustomEvent('session', { detail: { user } }))
  },
  fermer() {
    jeton = null
    ecrireStockage(null)
    window.dispatchEvent(new CustomEvent('session', { detail: null }))
  },
}

const api = axios.create({ baseURL: '/api', timeout: 30000, withCredentials: true })

// Un seul renouvellement à la fois, même si plusieurs requêtes en ont besoin ensemble.
// Un autre onglet peut avoir déjà fait tourner le cookie : on réessaie une fois après un court délai.
let renouvellement = null
async function demanderJeton() {
  const ancien = lireStockage()?.refreshToken // session ouverte avant le passage au cookie
  const { data } = await axios.post('/api/auth/refresh', ancien ? { refreshToken: ancien } : {}, { withCredentials: true })
  session.ouvrir({ token: data.token, user: data.user ?? lireStockage()?.user })
  return data.token
}
export function renouveler() {
  renouvellement ??= demanderJeton()
    .catch(async (erreur) => {
      if (!erreur.response) throw erreur // pas de réseau : la session reste ouverte (mode hors ligne)
      await new Promise((r) => setTimeout(r, 400))
      return demanderJeton()
    })
    .catch((erreur) => {
      if (erreur.response) session.fermer() // cookie absent ou expiré : retour à la connexion
      throw erreur
    })
    .finally(() => {
      renouvellement = null
    })
  return renouvellement
}

const routeAuth = (url = '') => /^\/?auth\/(login|register|refresh)/.test(url)

api.interceptors.request.use(async (config) => {
  // page rechargée : pas encore de jeton en mémoire, on le redemande avant d'appeler l'API
  if (!jeton && session.lire() && !routeAuth(config.url)) await renouveler()
  if (jeton) config.headers.Authorization = `Bearer ${jeton}`
  return config
})

api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur) => {
    const requete = erreur.config
    const code = erreur.response?.data?.code
    if (erreur.response?.status === 401 && ['TOKEN_EXPIRE', 'TOKEN_MANQUANT'].includes(code) && !requete._relance && session.lire()) {
      requete._relance = true
      try {
        const token = await renouveler()
        requete.headers.Authorization = `Bearer ${token}`
        return api(requete)
      } catch {
        /* session fermée par renouveler() */
      }
    } else if (erreur.response?.status === 401 && ['TOKEN_INVALIDE', 'COMPTE_INACTIF'].includes(code)) {
      session.fermer()
    }
    return Promise.reject(erreur)
  },
)

// Message lisible pour l'utilisateur, quelle que soit l'erreur
export function messageErreur(erreur) {
  if (erreur?.response?.data?.message) return erreur.response.data.message
  if (erreur?.code === 'ECONNABORTED') return 'Le serveur met trop de temps à répondre. Réessayez.'
  if (erreur && !erreur.response) return 'Connexion au serveur impossible. Vérifiez votre accès internet.'
  return 'Une erreur est survenue. Réessayez.'
}

export default api

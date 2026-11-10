// Client HTTP : jeton d'accès ajouté à chaque requête, renouvelé automatiquement à l'expiration
import axios from 'axios'

const CLE = 'tanana-madio-session'

export const session = {
  lire() {
    try {
      return JSON.parse(localStorage.getItem(CLE)) ?? null
    } catch {
      return null
    }
  },
  ecrire(valeur) {
    try {
      if (valeur) localStorage.setItem(CLE, JSON.stringify(valeur))
      else localStorage.removeItem(CLE)
    } catch {
      /* stockage indisponible (navigation privée) */
    }
    window.dispatchEvent(new CustomEvent('session', { detail: valeur }))
  },
}

const api = axios.create({ baseURL: '/api', timeout: 30000 })

api.interceptors.request.use((config) => {
  const s = session.lire()
  if (s?.token) config.headers.Authorization = `Bearer ${s.token}`
  return config
})

// Un seul renouvellement à la fois, même si plusieurs requêtes échouent ensemble
let renouvellement = null
async function renouveler() {
  const s = session.lire()
  if (!s?.refreshToken) throw new Error('pas de session')
  const { data } = await axios.post('/api/auth/refresh', { refreshToken: s.refreshToken })
  session.ecrire({ ...s, ...data })
  return data.token
}

api.interceptors.response.use(
  (reponse) => reponse,
  async (erreur) => {
    const requete = erreur.config
    const code = erreur.response?.data?.code
    if (erreur.response?.status === 401 && code === 'TOKEN_EXPIRE' && !requete._relance) {
      requete._relance = true
      try {
        renouvellement ??= renouveler().finally(() => {
          renouvellement = null
        })
        const token = await renouvellement
        requete.headers.Authorization = `Bearer ${token}`
        return api(requete)
      } catch {
        session.ecrire(null)
      }
    } else if (erreur.response?.status === 401 && ['TOKEN_INVALIDE', 'COMPTE_INACTIF'].includes(code)) {
      session.ecrire(null)
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

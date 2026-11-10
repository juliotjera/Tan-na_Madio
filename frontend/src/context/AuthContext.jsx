// Utilisateur connecté, partagé par toute l'application
import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { session } from '../api/axiosConfig'
import * as api from '../api'

export const AuthContext = createContext(null)

export const ACCUEIL_PAR_ROLE = {
  citoyen: '/citoyen',
  agent_municipal: '/agent',
  chauffeur: '/chauffeur',
  administrateur: '/admin',
}

export function AuthProvider({ children }) {
  const [etat, setEtat] = useState(() => session.lire())

  // la session peut changer ailleurs : jeton renouvelé ou expiré, autre onglet
  useEffect(() => {
    const surSession = (e) => setEtat(e.detail)
    const surStockage = (e) => e.key === 'tanana-madio-session' && setEtat(session.lire())
    window.addEventListener('session', surSession)
    window.addEventListener('storage', surStockage)
    return () => {
      window.removeEventListener('session', surSession)
      window.removeEventListener('storage', surStockage)
    }
  }, [])

  const ouvrir = useCallback((reponse) => {
    session.ecrire({ token: reponse.token, refreshToken: reponse.refreshToken, user: reponse.user })
    return reponse.user
  }, [])

  const connecter = useCallback(async (email, mdp) => ouvrir(await api.connexion(email, mdp)), [ouvrir])
  const inscrire = useCallback(async (champs) => ouvrir(await api.inscription(champs)), [ouvrir])

  const deconnecter = useCallback(async () => {
    const s = session.lire()
    try {
      if (s?.refreshToken) await api.deconnexion(s.refreshToken)
    } catch {
      /* déjà expirée côté serveur : on ferme quand même */
    }
    session.ecrire(null)
  }, [])

  const valeur = useMemo(
    () => ({ user: etat?.user ?? null, connecte: Boolean(etat?.token), connecter, inscrire, deconnecter }),
    [etat, connecter, inscrire, deconnecter],
  )
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

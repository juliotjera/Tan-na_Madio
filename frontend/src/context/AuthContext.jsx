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

  // le jeton de renouvellement reste dans le cookie httpOnly posé par l'API
  const ouvrir = useCallback((reponse) => {
    session.ouvrir({ token: reponse.token, user: reponse.user })
    return reponse.user
  }, [])

  const connecter = useCallback(async (email, mdp) => ouvrir(await api.connexion(email, mdp)), [ouvrir])
  const inscrire = useCallback(async (champs) => ouvrir(await api.inscription(champs)), [ouvrir])
  const connecterDemo = useCallback(async (role) => ouvrir(await api.connexionDemo(role)), [ouvrir])

  // met à jour l'utilisateur gardé en session (ex. : mot de passe provisoire remplacé)
  const majUser = useCallback((champs) => session.majUser(champs), [])

  const deconnecter = useCallback(async () => {
    try {
      await api.deconnexion() // révoque le jeton et efface le cookie
    } catch {
      /* déjà expirée côté serveur ou hors ligne : on ferme quand même */
    }
    session.fermer()
  }, [])

  const valeur = useMemo(
    () => ({ user: etat?.user ?? null, connecte: Boolean(etat?.user), connecter, connecterDemo, inscrire, deconnecter, majUser }),
    [etat, connecter, connecterDemo, inscrire, deconnecter, majUser],
  )
  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>
}

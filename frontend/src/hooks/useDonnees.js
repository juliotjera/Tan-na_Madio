// Chargement de données avec état (chargement, erreur), rechargement et rafraîchissement périodique
import { useCallback, useEffect, useRef, useState } from 'react'
import { messageErreur } from '../api/axiosConfig'

export function useDonnees(charger, dependances = [], { intervalle } = {}) {
  const [donnees, setDonnees] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(null)
  const fonction = useRef(charger)
  fonction.current = charger

  const recharger = useCallback(async ({ silencieux = false } = {}) => {
    if (!silencieux) setChargement(true)
    try {
      setDonnees(await fonction.current())
      setErreur(null)
    } catch (e) {
      setErreur(messageErreur(e))
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    recharger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependances)

  // rafraîchissement automatique, suspendu quand l'onglet est caché
  useEffect(() => {
    if (!intervalle) return undefined
    const id = setInterval(() => document.visibilityState === 'visible' && recharger({ silencieux: true }), intervalle)
    return () => clearInterval(id)
  }, [intervalle, recharger])

  return { donnees, setDonnees, chargement, erreur, recharger }
}

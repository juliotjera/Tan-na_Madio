// Position GPS du téléphone (navigator.geolocation), avec message clair en cas de refus
import { useCallback, useState } from 'react'

const MESSAGES = {
  1: 'Accès à la position refusé. Autorisez-le dans le navigateur, ou touchez la carte pour placer le point.',
  2: 'Position introuvable pour le moment. Touchez la carte pour placer le point.',
  3: 'La recherche de position a pris trop de temps. Réessayez ou touchez la carte.',
}

export function usePosition() {
  const [position, setPosition] = useState(null) // [lat, lng]
  const [precision, setPrecision] = useState(null) // mètres
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState(null)

  const localiser = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setErreur('Ce navigateur ne donne pas la position. Touchez la carte pour placer le point.')
      return
    }
    setRecherche(true)
    setErreur(null)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosition([p.coords.latitude, p.coords.longitude])
        setPrecision(Math.round(p.coords.accuracy))
        setRecherche(false)
      },
      (e) => {
        setErreur(MESSAGES[e.code] ?? MESSAGES[2])
        setRecherche(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    )
  }, [])

  return { position, setPosition, precision, setPrecision, recherche, erreur, localiser }
}

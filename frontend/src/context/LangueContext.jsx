// Langue de l'interface : français ou malagasy (choix mémorisé sur l'appareil).
// Les textes sont écrits en français dans le code ; t('…') renvoie la traduction malagasy si elle existe.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { MALAGASY } from '../i18n/mg'

const CLE = 'tanana-madio-langue'
const LangueContext = createContext({ langue: 'fr', setLangue: () => {}, t: (s) => s })

function lireLangue() {
  try {
    return localStorage.getItem(CLE) === 'mg' ? 'mg' : 'fr'
  } catch {
    return 'fr'
  }
}

export function LangueProvider({ children }) {
  const [langue, setLangueEtat] = useState(lireLangue)

  useEffect(() => {
    document.documentElement.lang = langue === 'mg' ? 'mg' : 'fr'
  }, [langue])

  const setLangue = useCallback((l) => {
    setLangueEtat(l)
    try {
      localStorage.setItem(CLE, l)
    } catch {
      /* stockage indisponible : le choix vaut pour la session */
    }
  }, [])

  // t('Bonjour {nom}', { nom: 'Jean' }) : traduction puis remplacement des variables
  const t = useCallback(
    (texte, variables) => {
      const traduit = langue === 'mg' ? (MALAGASY[texte] ?? texte) : texte
      return variables ? traduit.replace(/\{(\w+)\}/g, (_, k) => variables[k] ?? '') : traduit
    },
    [langue],
  )

  const valeur = useMemo(() => ({ langue, setLangue, t }), [langue, setLangue, t])
  return <LangueContext.Provider value={valeur}>{children}</LangueContext.Provider>
}

export const useLangue = () => useContext(LangueContext)

// <T>Valider</T> : texte traduit dans la langue choisie (pour les boutons et libellés écrits dans les pages)
export function T({ children }) {
  const { t } = useLangue()
  return typeof children === 'string' ? t(children) : children
}

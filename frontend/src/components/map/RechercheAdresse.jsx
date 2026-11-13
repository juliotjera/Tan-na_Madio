// Recherche d'un lieu à Antananarivo (OpenStreetMap Nominatim), lancée à la demande :
// le service gratuit demande de ne pas l'interroger à chaque frappe.
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Spinner } from '../common/ui'

// zone de recherche : agglomération d'Antananarivo
const ZONE = '47.40,-18.80,47.65,-19.02'

export default function RechercheAdresse({ onChoix }) {
  const [texte, setTexte] = useState('')
  const [resultats, setResultats] = useState(null)
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState(null)

  const chercher = async (e) => {
    e.preventDefault()
    if (texte.trim().length < 3) return
    setRecherche(true)
    setErreur(null)
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.search = new URLSearchParams({ q: texte.trim(), format: 'jsonv2', limit: '5', countrycodes: 'mg', viewbox: ZONE, bounded: '1', 'accept-language': 'fr' })
      const r = await fetch(url)
      if (!r.ok) throw new Error()
      const liste = await r.json()
      setResultats(liste.map((l) => ({ id: l.place_id, nom: l.display_name.split(',').slice(0, 3).join(','), position: [Number(l.lat), Number(l.lon)] })))
    } catch {
      setErreur('Recherche indisponible pour le moment. Touchez la carte pour placer le point.')
    } finally {
      setRecherche(false)
    }
  }

  return (
    <div className="mb-3">
      <form onSubmit={chercher} className="flex gap-2" role="search">
        <label className="relative flex-1">
          <span className="sr-only">Rechercher un lieu</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-encre-pale" />
          <input type="search" className="champ pl-9" placeholder="Quartier ou rue, ex. : Isotry" value={texte} onChange={(e) => setTexte(e.target.value)} />
        </label>
        <button type="submit" className="btn-secondaire" disabled={recherche || texte.trim().length < 3}>
          {recherche ? <Spinner className="h-4 w-4" /> : 'Rechercher'}
        </button>
      </form>
      {erreur && <p className="mt-2 text-sm text-ambre-700">{erreur}</p>}
      {resultats?.length === 0 && <p className="mt-2 text-sm text-encre-doux">Aucun lieu trouvé à Antananarivo. Essayez un autre nom, ou touchez la carte.</p>}
      {resultats?.length > 0 && (
        <ul className="mt-2 divide-y divide-trait overflow-hidden rounded-lg border border-trait bg-white">
          {resultats.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-3.5 py-2.5 text-left text-sm transition hover:bg-or-50"
                onClick={() => {
                  onChoix(r.position, r.nom)
                  setResultats(null)
                }}
              >
                {r.nom}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

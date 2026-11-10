// Chauffeur : la prochaine tournée en grand, puis l'historique
import { Plaque } from '../../components/layout/Logo'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Route, Truck } from 'lucide-react'
import { listerCollectes, profil } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { StatutBadge } from '../../components/common/Badge'
import { Chargement, Erreur, Pagination, Segments, Vide } from '../../components/common/ui'
import { Avancement } from '../agent/Collectes'
import { duree, jourHeure, kg, km, pluriel } from '../../utils/format'

const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'planifiee', libelle: 'Planifiées' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminee', libelle: 'Terminées' },
]

export default function MesTournees() {
  const { user } = useAuth()
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const moi = useDonnees(profil, [])
  const actives = useDonnees(async () => {
    const [enCours, planifiees] = await Promise.all([listerCollectes({ statut: 'en_cours', limit: 1 }), listerCollectes({ statut: 'planifiee', limit: 20 })])
    // la tournée en cours d'abord, sinon la plus proche dans le temps
    const prochaines = [...planifiees.collectes].sort((a, b) => new Date(a.date_planifiee) - new Date(b.date_planifiee))
    return enCours.collectes[0] ?? prochaines[0] ?? null
  }, [], { intervalle: 30000 })
  const liste = useDonnees(() => listerCollectes({ statut: statut || undefined, page, limit: 10 }), [statut, page])
  const prochaine = actives.donnees

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[26px] font-semibold sm:text-[30px]">Bonjour {user.prenom}</h1>
        <p className="mt-1 text-encre-doux">
          {moi.donnees?.camion_immatriculation ? (
            <>
              Votre camion : <Plaque numero={moi.donnees.camion_immatriculation} className="ml-1 align-middle" />
            </>
          ) : (
            'Aucun camion ne vous est affecté pour le moment.'
          )}
        </p>
      </div>

      {actives.erreur && <Erreur message={actives.erreur} onReessayer={actives.recharger} />}
      {actives.chargement && !actives.donnees && <Chargement />}
      {!actives.chargement && !prochaine && !actives.erreur && (
        <div className="carte">
          <Vide icone={Route} titre="Pas de tournée prévue" texte="Les tournées planifiées par les agents municipaux apparaîtront ici." />
        </div>
      )}
      {prochaine && (
        <Link to={`/chauffeur/tournees/${prochaine.id}`} className="block overflow-hidden rounded-carte bg-nuit text-white shadow-flotte transition hover:bg-nuit-800">
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-bleu-100/75">{prochaine.statut === 'en_cours' ? 'Tournée en cours' : 'Prochaine tournée'}</span>
              <StatutBadge statut={prochaine.statut} type="collecte" />
            </div>
            <p className="mt-2 font-titre text-[30px] font-semibold leading-tight sm:text-[36px]">{jourHeure(prochaine.date_planifiee)}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-ciel" /> {pluriel(prochaine.nb_points, 'arrêt')}
              </span>
              <span className="flex items-center gap-2">
                <Route className="h-4 w-4 text-ciel" /> {km(prochaine.distance_km)}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-ciel" /> {duree(prochaine.itineraire?.duree_estimee_min)}
              </span>
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-ciel" /> {prochaine.zone_nom ?? 'Plusieurs zones'}
              </span>
            </div>
            {prochaine.statut === 'en_cours' && (
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-ciel" style={{ width: `${(prochaine.nb_faits / Math.max(1, prochaine.nb_points)) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between bg-white/5 px-6 py-4 font-semibold sm:px-7">
            {prochaine.statut === 'en_cours' ? `Reprendre la tournée (${prochaine.nb_faits}/${prochaine.nb_points})` : 'Voir l’itinéraire'}
            <ArrowRight className="h-5 w-5 text-ciel" />
          </div>
        </Link>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Toutes mes tournées</h2>
          <Segments
            options={FILTRES}
            valeur={statut}
            onChange={(v) => {
              setStatut(v)
              setPage(1)
            }}
            libelle="Statut"
          />
        </div>
        {liste.donnees?.collectes.length === 0 && <p className="text-sm text-encre-doux">Aucune tournée avec ce statut.</p>}
        <ul className="space-y-3">
          {liste.donnees?.collectes.map((c) => (
            <li key={c.id}>
              <Link to={`/chauffeur/tournees/${c.id}`} className="carte flex items-center justify-between gap-4 p-4 transition hover:border-bleu/30">
                <div className="min-w-0">
                  <p className="font-medium">{jourHeure(c.date_planifiee)}</p>
                  <p className="text-sm text-encre-pale">
                    {c.zone_nom ?? 'Plusieurs zones'} · {km(c.distance_km)}
                    {c.poids_collecte_kg != null && ` · ${kg(c.poids_collecte_kg)}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatutBadge statut={c.statut} type="collecte" />
                  <Avancement faits={c.nb_faits} total={c.nb_points} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={10} onChange={setPage} />}
      </section>
    </div>
  )
}

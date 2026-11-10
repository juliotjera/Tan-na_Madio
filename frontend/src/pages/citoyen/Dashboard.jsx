// Citoyen : la carte des signalements de la ville, ses points éco, ses derniers envois
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Crosshair, Leaf } from 'lucide-react'
import { carteSignalements, mesSignalements, profil } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { usePosition } from '../../hooks/usePosition'
import { Cadrer, Carte, LegendeUrgences, MaPosition, MarqueurSignalement } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Erreur, Segments, Spinner } from '../../components/common/ui'
import { ilYa, palier, pluriel } from '../../utils/format'

const FILTRES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'valide', libelle: 'Validés' },
  { valeur: 'en_cours', libelle: 'En tournée' },
  { valeur: 'collecte', libelle: 'Collectés' },
]

export function CartePoints({ points }) {
  const { actuel, suivant, progression } = palier(points)
  return (
    <div className="carte overflow-hidden">
      <div className="bg-foret p-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-sm text-feuille-100/75">Vos points éco</p>
          <Leaf className="h-5 w-5 text-feuille" />
        </div>
        <p className="chiffre mt-1 text-[44px] leading-none text-white">{points}</p>
        <p className="mt-2 font-titre font-semibold text-feuille">{actuel.nom}</p>
      </div>
      <div className="p-5">
        {suivant ? (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-feuille-100" role="progressbar" aria-valuenow={Math.round(progression * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-feuille-600 transition-all" style={{ width: `${Math.round(progression * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm text-encre-doux">
              Encore {pluriel(suivant.seuil - points, 'point')} pour devenir <span className="font-semibold text-foret">{suivant.nom}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-encre-doux">Palier le plus haut atteint. Merci pour votre engagement !</p>
        )}
        <p className="mt-3 text-xs text-encre-pale">+2 à l’envoi · +5 à la validation · +10 au ramassage</p>
      </div>
    </div>
  )
}

export default function CitoyenDashboard() {
  const { user } = useAuth()
  const [statut, setStatut] = useState('')
  const { position, localiser, recherche, erreur: erreurGps } = usePosition()
  const carte = useDonnees(() => carteSignalements({ statut: statut || undefined }), [statut], { intervalle: 60000 })
  const moi = useDonnees(profil, [])
  const derniers = useDonnees(() => mesSignalements({ limit: 4 }), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[26px] font-semibold sm:text-[30px]">Bonjour {user.prenom}</h1>
          <p className="mt-1 text-encre-doux">Les dépôts d’ordures signalés dans la ville, mis à jour chaque minute.</p>
        </div>
        <Link to="/citoyen/signaler" className="btn-principal min-h-[48px] px-5 text-base">
          <Camera className="h-5 w-5" />
          Signaler un dépôt
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segments options={FILTRES} valeur={statut} onChange={setStatut} libelle="Filtrer par statut" />
            <button type="button" className="btn-secondaire" onClick={localiser} disabled={recherche}>
              {recherche ? <Spinner className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />}
              Me localiser
            </button>
          </div>
          {erreurGps && <p className="text-sm text-ambre-700">{erreurGps}</p>}
          {carte.erreur && <Erreur message={carte.erreur} onReessayer={carte.recharger} />}
          <Carte className="h-[440px] sm:h-[520px]">
            {carte.donnees?.map((s) => (
              <MarqueurSignalement key={s.id} signalement={s} estompe={s.statut === 'collecte'}>
                <div className="w-52 space-y-2">
                  {s.photo_url && <img src={s.photo_url} alt="" className="h-28 w-full rounded-lg object-cover" loading="lazy" />}
                  <div className="flex flex-wrap gap-1.5">
                    <StatutBadge statut={s.statut} />
                    <UrgenceBadge urgence={s.urgence} compact />
                  </div>
                  {s.description && <p className="text-encre">{s.description}</p>}
                  <p className="text-xs text-encre-pale">
                    {s.zone_nom ?? 'Hors zone'} · {ilYa(s.created_at)}
                  </p>
                </div>
              </MarqueurSignalement>
            ))}
            <MaPosition position={position} />
            {position && <Cadrer points={[position]} max={16} />}
          </Carte>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <LegendeUrgences />
            {carte.donnees && <p className="text-xs text-encre-pale">{pluriel(carte.donnees.length, 'signalement')} affichés</p>}
          </div>
        </section>

        <aside className="space-y-6">
          {moi.donnees && <CartePoints points={moi.donnees.points_eco ?? 0} />}
          <div className="carte p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mes derniers envois</h2>
              <Link to="/citoyen/signalements" className="text-sm font-semibold text-foret-700 hover:underline">
                Tout voir
              </Link>
            </div>
            {derniers.donnees?.signalements.length === 0 && <p className="mt-3 text-sm text-encre-doux">Aucun signalement pour l’instant. Le premier vous rapporte 2 points.</p>}
            <ul className="mt-3 divide-y divide-trait">
              {derniers.donnees?.signalements.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.description ?? s.adresse ?? 'Signalement'}</p>
                    <p className="text-xs text-encre-pale">{ilYa(s.created_at)}</p>
                  </div>
                  <StatutBadge statut={s.statut} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

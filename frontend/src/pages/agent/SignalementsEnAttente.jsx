// Validation des signalements : photo, lieu, urgence — valider ou rejeter
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, ImageOff, Inbox, RotateCcw, X } from 'lucide-react'
import { changerStatut, listerSignalements, listerZones } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, MarqueurSignalement, Zones } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chargement, EnTete, Erreur, Pagination, Segments, Spinner, Vide } from '../../components/common/ui'
import { dateHeure, ilYa, pluriel, URGENCES } from '../../utils/format'

const ONGLETS = [
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'valide', libelle: 'Validés' },
  { valeur: 'rejete', libelle: 'Rejetés' },
]

export default function SignalementsEnAttente() {
  const [statut, setStatut] = useState('en_attente')
  const [urgence, setUrgence] = useState('')
  const [zone, setZone] = useState('')
  const [page, setPage] = useState(1)
  const [choisi, setChoisi] = useState(null)
  const [action, setAction] = useState(null) // id en cours de traitement
  const zones = useDonnees(listerZones, [])
  const liste = useDonnees(
    () => listerSignalements({ statut, urgence: urgence || undefined, zone_id: zone || undefined, page, limit: 12 }),
    [statut, urgence, zone, page],
    { intervalle: 60000 },
  )
  const signalements = liste.donnees?.signalements ?? []

  useEffect(() => {
    if (!signalements.some((s) => s.id === choisi?.id)) setChoisi(signalements[0] ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liste.donnees])

  const decider = async (s, nouveau) => {
    setAction(s.id)
    try {
      await changerStatut(s.id, nouveau)
      toast.success(nouveau === 'valide' ? 'Signalement validé : +5 points pour le citoyen' : nouveau === 'rejete' ? 'Signalement rejeté' : 'Remis en attente')
      await liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setAction(null)
    }
  }

  return (
    <div>
      <EnTete titre="Signalements à valider" texte="Vérifiez la photo et le lieu. Un signalement validé peut être ajouté à une tournée." />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segments
          options={ONGLETS}
          valeur={statut}
          onChange={(v) => {
            setStatut(v)
            setPage(1)
          }}
          libelle="Statut"
        />
        <select className="champ w-auto py-2" value={urgence} onChange={(e) => (setUrgence(e.target.value), setPage(1))} aria-label="Urgence">
          <option value="">Toutes urgences</option>
          {Object.entries(URGENCES).map(([k, u]) => (
            <option key={k} value={k}>
              {u.libelle}
            </option>
          ))}
        </select>
        <select className="champ w-auto py-2" value={zone} onChange={(e) => (setZone(e.target.value), setPage(1))} aria-label="Zone">
          <option value="">Toutes les zones</option>
          {zones.donnees?.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nom}
            </option>
          ))}
        </select>
        {liste.donnees && <span className="text-sm text-encre-pale">{pluriel(liste.donnees.total, 'signalement')}</span>}
      </div>

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}
      {liste.donnees && signalements.length === 0 && (
        <div className="carte">
          <Vide icone={Inbox} titre="Aucun signalement ici" texte={statut === 'en_attente' ? 'Tous les signalements reçus ont été traités.' : 'Changez de filtre pour en voir d’autres.'} />
        </div>
      )}

      {signalements.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <ul className="space-y-3">
            {signalements.map((s) => (
              <li key={s.id}>
                <div
                  className={`carte flex cursor-pointer flex-col overflow-hidden transition sm:flex-row ${choisi?.id === s.id ? 'ring-2 ring-bleu-500' : 'hover:border-bleu/30'}`}
                  onClick={() => setChoisi(s)}
                >
                  <div className="h-44 shrink-0 bg-bleu-50 sm:h-auto sm:w-44">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt="Photo du dépôt" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-encre-pale">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <UrgenceBadge urgence={s.urgence} />
                      {statut !== 'en_attente' && <StatutBadge statut={s.statut} />}
                    </div>
                    <p className="font-medium">{s.description ?? 'Sans description'}</p>
                    <p className="text-sm text-encre-doux">
                      {[s.adresse, s.zone_nom ?? 'Hors zone'].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-encre-pale" title={dateHeure(s.created_at)}>
                      Par {s.citoyen_nom} · {ilYa(s.created_at)}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      {s.statut === 'en_attente' && (
                        <>
                          <button type="button" className="btn-accent min-h-[38px]" disabled={action === s.id} onClick={() => decider(s, 'valide')}>
                            {action === s.id ? <Spinner className="h-4 w-4 text-current" /> : <Check className="h-4 w-4" />}
                            Valider
                          </button>
                          <button type="button" className="btn-secondaire min-h-[38px]" disabled={action === s.id} onClick={() => decider(s, 'rejete')}>
                            <X className="h-4 w-4" /> Rejeter
                          </button>
                        </>
                      )}
                      {['valide', 'rejete'].includes(s.statut) && (
                        <button type="button" className="btn-secondaire min-h-[38px]" disabled={action === s.id} onClick={() => decider(s, 'en_attente')}>
                          <RotateCcw className="h-4 w-4" /> Remettre en attente
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={12} onChange={setPage} />}
          </ul>

          <aside className="hidden xl:block">
            <div className="sticky top-10">
              <Carte className="h-[520px]" zoom={15}>
                <Zones zones={zones.donnees} surbrillance={choisi?.zone_id} />
                {signalements.map((s) => (
                  <MarqueurSignalement key={s.id} signalement={s} estompe={choisi?.id !== s.id} onClick={setChoisi} />
                ))}
                {choisi && <Cadrer points={[[choisi.latitude, choisi.longitude]]} max={16} />}
              </Carte>
              {choisi && <p className="mt-2 text-xs text-encre-pale">GPS : {choisi.latitude.toFixed(5)}, {choisi.longitude.toFixed(5)}</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

// Validation des signalements : photo, lieu, urgence — valider ou rejeter
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Download, ImageOff, Inbox, Maximize2, RotateCcw, Users, X } from 'lucide-react'
import { changerStatut, listerSignalements, listerZones, motifsRejet, telechargerCsv } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, MarqueurSignalement, Zones } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chargement, EnTete, Erreur, Modal, Pagination, Segments, Spinner, Vide } from '../../components/common/ui'
import { dateHeure, ilYa, pluriel, URGENCES } from '../../utils/format'
import { T } from '../../context/LangueContext'

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
  const [agrandie, setAgrandie] = useState(null) // signalement dont la photo est affichée en grand
  const [exportEnCours, setExportEnCours] = useState(false)
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

  const [aRejeter, setARejeter] = useState(null)
  const [motif, setMotif] = useState('')
  const [motifLibre, setMotifLibre] = useState('')
  const motifs = useDonnees(() => (aRejeter ? motifsRejet() : null), [Boolean(aRejeter)])

  const decider = async (s, nouveau, raison) => {
    setAction(s.id)
    try {
      await changerStatut(s.id, nouveau, raison)
      if (nouveau === 'rejete') setARejeter(null)
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
      <EnTete
        titre="Signalements à valider"
        texte="Vérifiez la photo et le lieu. Un signalement validé peut être ajouté à une tournée."
        actions={
          <button
            type="button"
            className="btn-secondaire"
            disabled={exportEnCours}
            onClick={async () => {
              setExportEnCours(true)
              try {
                const nom = await telechargerCsv('signalements', { statut, urgence: urgence || undefined, zone_id: zone || undefined })
                toast.success(`Export enregistré : ${nom}`)
              } catch (err) {
                toast.error(messageErreur(err))
              } finally {
                setExportEnCours(false)
              }
            }}
          >
            {exportEnCours ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            <T>Exporter en CSV</T>
          </button>
        }
      />

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
          <option value=""><T>Toutes urgences</T></option>
          {Object.entries(URGENCES).map(([k, u]) => (
            <option key={k} value={k}>
              {u.libelle}
            </option>
          ))}
        </select>
        <select className="champ w-auto py-2" value={zone} onChange={(e) => (setZone(e.target.value), setPage(1))} aria-label="Zone">
          <option value=""><T>Toutes les zones</T></option>
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
                  className={`carte flex cursor-pointer flex-col overflow-hidden transition sm:flex-row ${choisi?.id === s.id ? 'ring-2 ring-or' : 'hover:border-marque/30'}`}
                  onClick={() => setChoisi(s)}
                >
                  <div className={`${s.photo_url ? 'h-44' : 'hidden sm:block'} shrink-0 bg-or-50 sm:h-auto sm:w-44`}>
                    {s.photo_url ? (
                      <button
                        type="button"
                        className="group relative block h-full w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAgrandie(s)
                        }}
                        aria-label="Agrandir la photo"
                      >
                        <img src={s.photo_url} alt="Photo du dépôt" className="h-full w-full object-cover" loading="lazy" />
                        <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-ardoise/70 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Maximize2 className="h-4 w-4" />
                        </span>
                      </button>
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
                    {s.nb_soutiens > 0 && (
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-marque-700">
                        <Users className="h-3.5 w-3.5" /> Confirmé par {s.nb_soutiens} autre{s.nb_soutiens > 1 ? 's' : ''} habitant{s.nb_soutiens > 1 ? 's' : ''}
                      </p>
                    )}
                    {s.statut === 'rejete' && s.motif_rejet && <p className="text-xs text-encre-doux">Motif : {s.motif_rejet}</p>}
                    <div className="mt-auto flex flex-wrap gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      {s.statut === 'en_attente' && (
                        <>
                          <button type="button" className="btn-accent min-h-[38px]" disabled={action === s.id} onClick={() => decider(s, 'valide')}>
                            {action === s.id ? <Spinner className="h-4 w-4 text-current" /> : <Check className="h-4 w-4" />}
                            <T>Valider</T>
                          </button>
                          <button
                            type="button"
                            className="btn-secondaire min-h-[38px]"
                            disabled={action === s.id}
                            onClick={() => {
                              setMotif('')
                              setMotifLibre('')
                              setARejeter(s)
                            }}
                          >
                            <X className="h-4 w-4" /> <T>Rejeter</T>
                          </button>
                        </>
                      )}
                      {['valide', 'rejete'].includes(s.statut) && (
                        <button type="button" className="btn-secondaire min-h-[38px]" disabled={action === s.id} onClick={() => decider(s, 'en_attente')}>
                          <RotateCcw className="h-4 w-4" /> <T>Remettre en attente</T>
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
      <Modal ouvert={Boolean(agrandie)} onFermer={() => setAgrandie(null)} titre={agrandie?.description ?? 'Photo du dépôt'} large>
        {agrandie && (
          <div className="space-y-3">
            <img src={agrandie.photo_url} alt="Photo du dépôt" className="max-h-[70vh] w-full rounded-lg bg-fond object-contain" />
            <div className="flex flex-wrap items-center gap-2 text-sm text-encre-doux">
              <UrgenceBadge urgence={agrandie.urgence} />
              <span>{[agrandie.adresse, agrandie.zone_nom ?? 'Hors zone'].filter(Boolean).join(', ')}</span>
              <span className="text-encre-pale">{dateHeure(agrandie.created_at)}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        ouvert={Boolean(aRejeter)}
        onFermer={() => setARejeter(null)}
        titre="Rejeter le signalement"
        pied={
          <>
            <button type="button" className="btn-secondaire" onClick={() => setARejeter(null)}>
              <T>Annuler</T>
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={action === aRejeter?.id || !(motif === 'autre' ? motifLibre.trim() : motif)}
              onClick={() => decider(aRejeter, 'rejete', motif === 'autre' ? motifLibre.trim() : motif)}
            >
              {action === aRejeter?.id && <Spinner className="h-4 w-4" />}
              <T>Rejeter</T>
            </button>
          </>
        }
      >
        {aRejeter && (
          <fieldset className="space-y-2">
            <legend className="mb-3 text-sm text-encre-doux">Le citoyen verra ce motif dans son suivi et dans sa notification.</legend>
            {[...(motifs.donnees ?? []), 'autre'].map((m) => (
              <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition ${motif === m ? 'border-or bg-or-50' : 'border-trait hover:bg-fond'}`}>
                <input type="radio" name="motif" className="accent-marque" checked={motif === m} onChange={() => setMotif(m)} />
                {m === 'autre' ? 'Autre motif' : m}
              </label>
            ))}
            {motif === 'autre' && (
              <input className="champ mt-2" maxLength={255} placeholder="Précisez le motif" value={motifLibre} onChange={(e) => setMotifLibre(e.target.value)} autoFocus />
            )}
          </fieldset>
        )}
      </Modal>
    </div>
  )
}

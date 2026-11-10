// Exécution d'une tournée par le chauffeur : itinéraire, arrêts numérotés, « Marquer collecté », fin de tournée
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Check, Navigation, Play, Flag } from 'lucide-react'
import { collecte as chargerCollecte, demarrerCollecte, marquerPoint, terminerCollecte } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Champ, Chargement, Erreur, Modal, Spinner } from '../../components/common/ui'
import { duree, jourHeure, kg, km } from '../../utils/format'

// Lien vers l'application de navigation du téléphone
const guidage = (s) => `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`

export default function DetailTournee() {
  const { id } = useParams()
  const tournee = useDonnees(() => chargerCollecte(id), [id])
  const [occupe, setOccupe] = useState(null)
  const [fin, setFin] = useState(false)
  const [poids, setPoids] = useState('')
  const [cible, setCible] = useState(null) // arrêt affiché sur la carte
  const c = tournee.donnees

  const prochain = useMemo(() => c?.signalements.find((s) => !s.collecte_fait) ?? null, [c])
  const etapes = useMemo(() => c?.signalements.map((s) => ({ ...s, active: c.statut === 'en_cours' && s.id === prochain?.id })) ?? [], [c, prochain])
  const cadre = useMemo(() => {
    if (cible) return [[cible.latitude, cible.longitude]]
    return c?.itineraire?.trace?.length ? c.itineraire.trace : (c?.signalements.map((s) => [s.latitude, s.longitude]) ?? [])
  }, [c, cible])

  const agir = async (cle, action, message) => {
    setOccupe(cle)
    try {
      tournee.setDonnees(await action())
      if (message) toast.success(message)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setOccupe(null)
    }
  }

  if (tournee.chargement && !c) return <Chargement />
  if (tournee.erreur) return <Erreur message={tournee.erreur} onReessayer={tournee.recharger} />
  if (!c) return null

  const faits = c.nb_faits
  const total = c.nb_points
  const tousFaits = faits === total

  return (
    <div className="space-y-5">
      <Link to="/chauffeur" className="btn-discret -ml-3">
        <ArrowLeft className="h-4 w-4" /> Mes tournées
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatutBadge statut={c.statut} type="collecte" />
            <span className="text-sm text-encre-pale">{c.camion_immatriculation}</span>
          </div>
          <h1 className="mt-2 text-[26px] font-semibold sm:text-[30px]">{jourHeure(c.date_planifiee)}</h1>
          <p className="text-encre-doux">
            {c.zone_nom ?? 'Plusieurs zones'} · {km(c.distance_km)} · {duree(c.itineraire?.duree_estimee_min)} environ
          </p>
        </div>
        {c.statut === 'planifiee' && (
          <button type="button" className="btn-principal min-h-[52px] px-6 text-base" disabled={occupe === 'demarrer'} onClick={() => agir('demarrer', () => demarrerCollecte(c.id), 'Tournée démarrée. Bonne route !')}>
            {occupe === 'demarrer' ? <Spinner className="h-5 w-5 text-white" /> : <Play className="h-5 w-5" />}
            Démarrer la tournée
          </button>
        )}
      </div>

      {c.notes && <p className="rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">Consigne de l’agent : {c.notes}</p>}

      {/* Progression X/N */}
      <div className="carte p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Points collectés</span>
          <span className="chiffre text-lg text-foret">
            {faits}/{total}
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-feuille-100" role="progressbar" aria-valuenow={faits} aria-valuemin={0} aria-valuemax={total}>
          <div className="h-full rounded-full bg-feuille-600 transition-all duration-500" style={{ width: `${(faits / Math.max(1, total)) * 100}%` }} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Carte className="h-[340px] lg:h-[560px]" zoom={15}>
          <Itineraire trace={c.itineraire?.trace} etapes={etapes} depart={c.itineraire?.depart} onEtape={setCible} />
          <Cadrer points={cadre} max={17} />
        </Carte>

        <section className="carte p-4 sm:p-5">
          <h2 className="mb-3 text-lg font-semibold">Arrêts dans l’ordre</h2>
          <ol className="space-y-2">
            {c.signalements.map((s) => {
              const actif = c.statut === 'en_cours' && s.id === prochain?.id
              return (
                <li key={s.id} className={`rounded-xl border p-3 transition ${actif ? 'border-ambre bg-ambre-50/60' : s.collecte_fait ? 'border-trait bg-feuille-50/50' : 'border-trait'}`}>
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={() => setCible(s)} className={`etape shrink-0 border-0 shadow-none ${s.collecte_fait ? 'bg-feuille text-foret' : actif ? 'bg-ambre text-foret' : 'bg-foret text-white'}`} aria-label={`Voir l’arrêt ${s.ordre} sur la carte`}>
                      {s.collecte_fait ? <Check className="h-4 w-4" /> : s.ordre}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${s.collecte_fait ? 'text-encre-pale line-through' : ''}`}>{s.description ?? 'Dépôt signalé'}</p>
                      {s.adresse && <p className="text-xs text-encre-pale">{s.adresse}</p>}
                      <div className="mt-1.5">
                        <UrgenceBadge urgence={s.urgence} compact />
                      </div>
                    </div>
                    {s.photo_url && <img src={s.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />}
                  </div>
                  {c.statut === 'en_cours' && !s.collecte_fait && (
                    <div className="mt-3 flex gap-2">
                      <a href={guidage(s)} target="_blank" rel="noreferrer" className="btn-secondaire min-h-[44px] flex-1">
                        <Navigation className="h-4 w-4" /> Guidage
                      </a>
                      <button
                        type="button"
                        className={`${actif ? 'btn-vert' : 'btn-secondaire'} min-h-[44px] flex-[1.4]`}
                        disabled={occupe === s.id}
                        onClick={() => agir(s.id, () => marquerPoint(c.id, s.id), `Arrêt ${s.ordre} collecté`)}
                      >
                        {occupe === s.id ? <Spinner className="h-4 w-4 text-current" /> : <Check className="h-4 w-4" />}
                        Marquer collecté
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>

          {c.statut === 'en_cours' && (
            <div className="mt-4 border-t border-trait pt-4">
              <button type="button" className={`${tousFaits ? 'btn-principal' : 'btn-secondaire'} min-h-[50px] w-full text-base`} onClick={() => setFin(true)}>
                <Flag className="h-5 w-5" /> Terminer la tournée
              </button>
              {!tousFaits && <p className="mt-2 text-center text-xs text-encre-pale">Les arrêts non collectés seront reproposés pour une prochaine tournée.</p>}
            </div>
          )}
          {c.statut === 'terminee' && (
            <p className="mt-4 rounded-xl bg-feuille-50 px-4 py-3 text-sm text-foret">
              Tournée terminée : {faits}/{total} arrêts{c.poids_collecte_kg != null && `, ${kg(c.poids_collecte_kg)} collectés`}.
            </p>
          )}
        </section>
      </div>

      <Modal
        ouvert={fin}
        onFermer={() => setFin(false)}
        titre="Terminer la tournée"
        pied={
          <>
            <button type="button" className="btn-secondaire" onClick={() => setFin(false)}>
              Continuer la tournée
            </button>
            <button
              type="button"
              className="btn-principal"
              disabled={occupe === 'terminer'}
              onClick={async () => {
                await agir('terminer', () => terminerCollecte(c.id, { poids_collecte_kg: poids === '' ? null : Number(poids) }), 'Tournée terminée. Merci !')
                setFin(false)
              }}
            >
              {occupe === 'terminer' && <Spinner className="h-4 w-4 text-white" />}
              Terminer
            </button>
          </>
        }
      >
        <p className="text-encre-doux">
          {tousFaits ? 'Tous les arrêts sont collectés.' : `${total - faits} arrêt(s) non collecté(s) : ils seront reproposés aux agents.`} Le camion redeviendra disponible.
        </p>
        <Champ libelle="Poids collecté (kg)" aide="Facultatif : relevé à la pesée" className="mt-4">
          {(idChamp) => <input id={idChamp} type="number" min="0" inputMode="numeric" className="champ" value={poids} onChange={(e) => setPoids(e.target.value)} />}
        </Champ>
      </Modal>
    </div>
  )
}

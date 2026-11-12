// Détail de la tournée (version d'origine) : carte légendée et progression à gauche ;
// statut, camion, zone, date et bouton « Terminer la tournée » à droite ; points à collecter avec « Marquer »
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, Navigation, Play, Truck } from 'lucide-react'
import { collecte as chargerCollecte, demarrerCollecte, marquerPoint, terminerCollecte } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { StatutBadge } from '../../components/common/Badge'
import { Champ, Chargement, Erreur, Modal, Spinner } from '../../components/common/ui'
import { kg, km } from '../../utils/format'

// Lien vers l'application de navigation du téléphone
const guidage = (s) => `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

export default function DetailTournee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const tournee = useDonnees(() => chargerCollecte(id), [id])
  const [occupe, setOccupe] = useState(null)
  const [fin, setFin] = useState(false)
  const [poids, setPoids] = useState('')
  const [cible, setCible] = useState(null) // arrêt centré sur la carte
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
  const enCours = c.statut === 'en_cours'

  return (
    <div className="rounded-carte border border-trait/60 bg-white/40 p-4 sm:p-6">
      <div className="mb-6 flex items-start gap-4">
        <button type="button" onClick={() => navigate('/chauffeur/tournees')} className="btn-discret mt-1 min-h-0 p-2" aria-label="Retour à mes tournées">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-[26px]">Détail de la tournée</h1>
          <p className="text-encre-doux">Collecte du {dateFr(c.date_planifiee)}</p>
        </div>
      </div>

      {c.notes && <p className="mb-4 rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">Consigne de l’agent : {c.notes}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Carte et progression */}
        <div className="space-y-4">
          <div className="carte relative p-5">
            <Carte className="h-[340px] lg:h-[440px]" zoom={15}>
              <Itineraire trace={c.itineraire?.trace} etapes={etapes} depart={c.itineraire?.depart} onEtape={setCible} />
              <Cadrer points={cadre} max={17} />
            </Carte>
            <div className="absolute bottom-8 left-8 z-[500] rounded-xl bg-white px-4 py-3 text-sm shadow-carte">
              <p className="font-semibold">Légende</p>
              <p className="mt-1.5 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-vert-500" /> ✓ Collecté
              </p>
              <p className="mt-1 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-encre-pale" /> Ordre de collecte
              </p>
            </div>
          </div>

          <div className="carte p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-titre text-lg font-bold">Progression</p>
                <p className="text-sm text-encre-doux">
                  {faits} / {total} Points Collecté{faits > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-encre-doux">Distance estimée</p>
                <p className="font-semibold">{km(c.distance_km)}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-fond" role="progressbar" aria-valuenow={faits} aria-valuemin={0} aria-valuemax={total}>
              <div className="h-full rounded-full bg-vert-500 transition-all duration-500" style={{ width: `${(faits / Math.max(1, total)) * 100}%` }} />
            </div>
            {enCours && tousFaits && (
              <p className="mt-4 rounded-xl border border-vert-300 bg-vert-50 px-4 py-3 text-sm text-vert-700">🎉 Tous les points collectés ! Vous pouvez terminer la tournée.</p>
            )}
          </div>
        </div>

        {/* Informations et points */}
        <div className="space-y-4">
          <div className="carte p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-encre-doux">Statut</p>
                <div className="mt-1">
                  <StatutBadge statut={c.statut} type="collecte" />
                </div>
              </div>
              <Truck className="h-6 w-6 text-encre-pale" />
            </div>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-sm text-encre-doux">Camion</dt>
                <dd className="font-semibold">{c.camion_immatriculation}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux">Zone</dt>
                <dd className="font-semibold">{c.zone_nom ?? 'Plusieurs zones'}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux">Date planifiée</dt>
                <dd className="font-semibold">{dateFr(c.date_planifiee)}</dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-trait pt-5">
              {c.statut === 'planifiee' && (
                <button type="button" className="btn-principal w-full" disabled={occupe === 'demarrer'} onClick={() => agir('demarrer', () => demarrerCollecte(c.id), 'Tournée démarrée. Bonne route !')}>
                  {occupe === 'demarrer' ? <Spinner className="h-4 w-4 text-white" /> : <Play className="h-4 w-4" />} Démarrer la tournée
                </button>
              )}
              {enCours && (
                <>
                  <button type="button" className="btn-principal" disabled={!tousFaits} onClick={() => setFin(true)}>
                    <CheckCircle2 className="h-4 w-4" /> Terminer la tournée
                  </button>
                  {!tousFaits && <p className="mt-2 text-xs text-encre-doux">Terminez la tournée une fois tous les points collectés.</p>}
                </>
              )}
              {c.statut === 'terminee' && (
                <p className="text-sm text-vert-700">
                  Tournée terminée : {faits}/{total} points{c.poids_collecte_kg != null && `, ${kg(c.poids_collecte_kg)} collectés`}.
                </p>
              )}
              {c.statut === 'annulee' && <p className="text-sm text-encre-doux">Cette tournée a été annulée.</p>}
            </div>
          </div>

          <div className="carte p-5">
            <h2 className="text-xl">Points à collecter</h2>
            <ol className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {c.signalements.map((s) => (
                <li key={s.id} className={`rounded-xl border p-3 ${enCours && s.id === prochain?.id ? 'border-ambre bg-ambre-50/40' : 'border-trait'}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCible(s)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vert-100 text-sm font-bold text-vert-700"
                      aria-label={`Voir le point ${s.ordre} sur la carte`}
                    >
                      {s.ordre}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.description ?? s.adresse ?? 'Signalement'}</p>
                      <p className="text-xs text-encre-pale">
                        {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs">
                        Statut :{' '}
                        <span className={s.collecte_fait ? 'font-semibold text-vert' : 'font-semibold text-ambre-700'}>{s.collecte_fait ? 'Collecté' : 'À collecter'}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.collecte_fait ? 'bg-vert-100 text-vert-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.collecte_fait ? 'Collecté' : 'À collecter'}
                      </span>
                      {enCours && !s.collecte_fait && (
                        <div className="flex gap-1.5">
                          <a href={guidage(s)} target="_blank" rel="noreferrer" className="btn-discret min-h-[36px] px-2" title="Guidage GPS" aria-label={`Guidage vers le point ${s.ordre}`}>
                            <Navigation className="h-4 w-4" />
                          </a>
                          <button type="button" className="btn-secondaire min-h-[36px] px-3" disabled={occupe === s.id} onClick={() => agir(s.id, () => marquerPoint(c.id, s.id), `Point ${s.ordre} collecté`)}>
                            {occupe === s.id ? <Spinner className="h-4 w-4" /> : 'Marquer'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <Modal
        ouvert={fin}
        onFermer={() => setFin(false)}
        titre="Terminer la tournée"
        pied={
          <>
            <button type="button" className="btn-secondaire" onClick={() => setFin(false)}>
              Annuler
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
        <p className="text-encre-doux">Tous les points sont collectés. Le camion redeviendra disponible.</p>
        <Champ libelle="Poids collecté (kg)" aide="Facultatif : relevé à la pesée" className="mt-4">
          {(idChamp) => <input id={idChamp} type="number" min="0" inputMode="numeric" className="champ" value={poids} onChange={(e) => setPoids(e.target.value)} />}
        </Champ>
      </Modal>
    </div>
  )
}

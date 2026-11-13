// Détail de la tournée (version d'origine) : carte légendée et progression à gauche ;
// statut, camion, zone, date et bouton « Terminer la tournée » à droite ; points à collecter avec « Marquer ».
// Hors connexion, les points marqués sont gardés sur le téléphone et envoyés au retour du réseau.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, CheckCircle2, CloudOff, Navigation, Play, RefreshCw, Truck } from 'lucide-react'
import { collecte as chargerCollecte, demarrerCollecte, marquerPoint, terminerCollecte } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { StatutBadge } from '../../components/common/Badge'
import { Champ, Chargement, Erreur, Modal, Spinner } from '../../components/common/ui'
import { kg, km } from '../../utils/format'
import { avecPointsEnAttente, erreurReseau, garderTournee, mettreEnAttente, pointsEnAttente, synchroniser, tourneeGardee } from '../../utils/horsLigne'
import { T } from '../../context/LangueContext'

// Lien vers l'application de navigation du téléphone
const guidage = (s) => `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`
const dateFr = (d) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

export default function DetailTournee() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [horsLigne, setHorsLigne] = useState(false) // tournée affichée depuis la copie du téléphone
  const tournee = useDonnees(async () => {
    try {
      const frais = await chargerCollecte(id)
      garderTournee(frais)
      setHorsLigne(false)
      return avecPointsEnAttente(frais)
    } catch (err) {
      const copie = erreurReseau(err) && tourneeGardee(id)
      if (!copie) throw err
      setHorsLigne(true)
      return avecPointsEnAttente(copie)
    }
  }, [id])
  const [attente, setAttente] = useState(() => pointsEnAttente(id).length)
  const [synchro, setSynchro] = useState(false)
  const [occupe, setOccupe] = useState(null)
  const [fin, setFin] = useState(false)
  const [poids, setPoids] = useState('')
  const [cible, setCible] = useState(null) // arrêt centré sur la carte
  const c = tournee.donnees
  const { recharger } = tournee

  // envoi des points gardés hors connexion, au retour du réseau ou à la demande
  const envoyerAttente = useCallback(async () => {
    if (!pointsEnAttente(id).length) return
    setSynchro(true)
    try {
      const { envoyes, refuses } = await synchroniser()
      if (envoyes) toast.success(`${envoyes} point${envoyes > 1 ? 's' : ''} envoyé${envoyes > 1 ? 's' : ''}`)
      if (refuses.length) toast.error(`${refuses.length} point${refuses.length > 1 ? 's' : ''} refusé${refuses.length > 1 ? 's' : ''} par le serveur (tournée modifiée entre-temps)`)
    } finally {
      setAttente(pointsEnAttente(id).length)
      setSynchro(false)
      recharger({ silencieux: true })
    }
  }, [id, recharger])

  useEffect(() => {
    envoyerAttente()
    window.addEventListener('online', envoyerAttente)
    return () => window.removeEventListener('online', envoyerAttente)
  }, [envoyerAttente])

  const marquer = async (s) => {
    setOccupe(s.id)
    try {
      tournee.setDonnees(avecPointsEnAttente(await marquerPoint(c.id, s.id)))
      toast.success(`Point ${s.ordre} collecté`)
    } catch (err) {
      if (!erreurReseau(err)) return toast.error(messageErreur(err))
      mettreEnAttente(c.id, s.id)
      setAttente(pointsEnAttente(id).length)
      tournee.setDonnees(avecPointsEnAttente(c))
      toast(`Pas de réseau : point ${s.ordre} gardé sur le téléphone, il sera envoyé automatiquement.`, { icon: '📶' })
    } finally {
      setOccupe(null)
    }
  }

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
    <div className="pb-24 sm:rounded-carte sm:border sm:border-trait/60 sm:bg-white/40 sm:p-6 lg:pb-6">
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
      {(horsLigne || attente > 0) && (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-ambre/40 bg-ambre-50 px-4 py-3 text-sm text-ambre-700 sm:flex-row sm:items-center sm:justify-between" role="status">
          <p className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 shrink-0" />
            {horsLigne ? 'Hors connexion : dernière version enregistrée sur le téléphone. ' : ''}
            {attente > 0 && `${attente} point${attente > 1 ? 's' : ''} en attente d’envoi.`}
          </p>
          <button type="button" className="btn-secondaire min-h-[36px] shrink-0" disabled={synchro} onClick={() => (attente ? envoyerAttente() : recharger())}>
            {synchro ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} Réessayer
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Carte et progression */}
        <div className="space-y-4">
          <div className="carte relative isolate p-2 sm:p-5">
            <Carte className="h-[340px] lg:h-[440px]" zoom={15}>
              <Itineraire trace={c.itineraire?.trace} etapes={etapes} depart={c.itineraire?.depart} onEtape={setCible} />
              <Cadrer points={cadre} max={17} />
            </Carte>
            <div className="absolute bottom-5 left-5 z-10 rounded-xl bg-white/95 px-3 py-2 text-xs shadow-carte sm:bottom-8 sm:left-8 sm:px-4 sm:py-3 sm:text-sm">
              <p className="font-semibold"><T>Légende</T></p>
              <p className="mt-1.5 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-or" /> ✓ Collecté
              </p>
              <p className="mt-1 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-encre-pale" /> Ordre de collecte
              </p>
            </div>
          </div>

          <div className="carte p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-titre text-lg font-bold"><T>Progression</T></p>
                <p className="text-sm text-encre-doux">
                  {faits} / {total} Points Collecté{faits > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-encre-doux"><T>Distance estimée</T></p>
                <p className="font-semibold">{km(c.distance_km)}</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-fond" role="progressbar" aria-valuenow={faits} aria-valuemin={0} aria-valuemax={total}>
              <div className="h-full rounded-full bg-or transition-all duration-500" style={{ width: `${(faits / Math.max(1, total)) * 100}%` }} />
            </div>
            {enCours && tousFaits && (
              <p className="mt-4 rounded-xl border border-or-300 bg-or-50 px-4 py-3 text-sm text-marque-700">🎉 Tous les points collectés ! Vous pouvez terminer la tournée.</p>
            )}
          </div>
        </div>

        {/* Informations et points */}
        <div className="space-y-4">
          <div className="carte p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-encre-doux"><T>Statut</T></p>
                <div className="mt-1">
                  <StatutBadge statut={c.statut} type="collecte" />
                </div>
              </div>
              <Truck className="h-6 w-6 text-encre-pale" />
            </div>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-sm text-encre-doux"><T>Camion</T></dt>
                <dd className="font-semibold">{c.camion_immatriculation}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux"><T>Zone</T></dt>
                <dd className="font-semibold">{c.zone_nom ?? 'Plusieurs zones'}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux"><T>Date planifiée</T></dt>
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
                  <button type="button" className="btn-principal" disabled={!tousFaits || attente > 0} onClick={() => setFin(true)}>
                    <CheckCircle2 className="h-4 w-4" /> <T>Terminer la tournée</T>
                  </button>
                  {!tousFaits && <p className="mt-2 text-xs text-encre-doux">Terminez la tournée une fois tous les points collectés.</p>}
                  {tousFaits && attente > 0 && <p className="mt-2 text-xs text-ambre-700">Les points gardés hors connexion doivent d’abord être envoyés.</p>}
                </>
              )}
              {c.statut === 'terminee' && (
                <p className="text-sm text-marque-700">
                  Tournée terminée : {faits}/{total} points{c.poids_collecte_kg != null && `, ${kg(c.poids_collecte_kg)} collectés`}.
                </p>
              )}
              {c.statut === 'annulee' && <p className="text-sm text-encre-doux">Cette tournée a été annulée.</p>}
            </div>
          </div>

          <div className="carte p-5">
            <h2 className="text-xl"><T>Points à collecter</T></h2>
            <ol className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {c.signalements.map((s) => (
                <li key={s.id} className={`rounded-xl border p-3 ${enCours && s.id === prochain?.id ? 'border-ambre bg-ambre-50/40' : 'border-trait'}`}>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCible(s)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-or-100 text-sm font-bold text-marque-700"
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
                        <span className={s.collecte_fait ? 'font-semibold text-marque' : 'font-semibold text-ambre-700'}>{s.en_attente_envoi ? 'Collecté (envoi en attente)' : s.collecte_fait ? 'Collecté' : 'À collecter'}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.collecte_fait ? 'bg-or-100 text-marque-700' : 'bg-slate-100 text-slate-600'}`}>
                        {s.collecte_fait ? 'Collecté' : 'À collecter'}
                      </span>
                      {enCours && !s.collecte_fait && (
                        <div className="flex gap-1.5">
                          <a href={guidage(s)} target="_blank" rel="noreferrer" className="btn-discret min-h-[36px] px-2" title="Guidage GPS" aria-label={`Guidage vers le point ${s.ordre}`}>
                            <Navigation className="h-4 w-4" />
                          </a>
                          <button type="button" className="btn-secondaire min-h-[36px] px-3" disabled={occupe === s.id} onClick={() => marquer(s)}>
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

      {/* téléphone : l'action du moment toujours à portée de pouce, au-dessus de la barre de navigation */}
      {(c.statut === 'planifiee' || enCours) && (
        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-trait bg-white/95 px-4 py-3 shadow-flotte backdrop-blur lg:hidden">
          {c.statut === 'planifiee' && (
            <button type="button" className="btn-principal w-full" disabled={occupe === 'demarrer'} onClick={() => agir('demarrer', () => demarrerCollecte(c.id), 'Tournée démarrée. Bonne route !')}>
              {occupe === 'demarrer' ? <Spinner className="h-4 w-4 text-white" /> : <Play className="h-4 w-4" />} Démarrer la tournée
            </button>
          )}
          {enCours && prochain && (
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ambre text-sm font-bold text-ardoise">{prochain.ordre}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-encre-doux">
                  Prochain arrêt · {faits}/{total}
                </p>
                <p className="truncate text-sm font-semibold">{prochain.description ?? prochain.adresse ?? 'Signalement'}</p>
              </div>
              <a href={guidage(prochain)} target="_blank" rel="noreferrer" className="btn-secondaire min-h-[42px] px-3" aria-label={`Guidage vers l’arrêt ${prochain.ordre}`}>
                <Navigation className="h-4 w-4" />
              </a>
              <button type="button" className="btn-principal min-h-[42px] px-4" disabled={occupe === prochain.id} onClick={() => marquer(prochain)}>
                {occupe === prochain.id ? <Spinner className="h-4 w-4 text-white" /> : <CheckCircle2 className="h-4 w-4" />} Marquer
              </button>
            </div>
          )}
          {enCours && !prochain && (
            <button type="button" className="btn-principal w-full" disabled={attente > 0} onClick={() => setFin(true)}>
              <CheckCircle2 className="h-4 w-4" /> {attente > 0 ? 'Envoi des points en attente…' : 'Terminer la tournée'}
            </button>
          )}
        </div>
      )}

      <Modal
        ouvert={fin}
        onFermer={() => setFin(false)}
        titre="Terminer la tournée"
        pied={
          <>
            <button type="button" className="btn-secondaire" onClick={() => setFin(false)}>
              <T>Annuler</T>
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
              <T>Terminer</T>
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

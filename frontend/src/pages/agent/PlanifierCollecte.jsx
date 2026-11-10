// Planifier une tournée en 4 étapes :
// 1. camion, zone, date — 2. signalements validés — 3. itinéraire optimisé (Dijkstra + glouton 2-opt) — 4. confirmation
import { Plaque } from '../../components/layout/Logo'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Check, Clock, Gauge, Route as IconeRoute, Sparkles, Truck } from 'lucide-react'
import { creerCollecte, listerCamions, listerSignalements, listerZones, optimiser, suggestion } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, Itineraire, MarqueurSignalement, Zones } from '../../components/map/Carte'
import { UrgenceBadge } from '../../components/common/Badge'
import { Champ, Chargement, Erreur, Spinner, Vide } from '../../components/common/ui'
import { duree, ilYa, kg, km, pluriel } from '../../utils/format'

const ETAPES = ['Camion et date', 'Signalements', 'Itinéraire', 'Confirmation']
// mêmes estimations que l'algorithme de sélection côté serveur
const POIDS_KG = { faible: 50, moyen: 120, eleve: 250, critique: 400 }

function demainMatin() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(7, 30, 0, 0)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

function Etapes({ actuelle }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Étapes">
      {ETAPES.map((nom, i) => (
        <li key={nom} aria-current={i === actuelle ? 'step' : undefined}>
          <span className={`block h-1.5 rounded-full ${i <= actuelle ? 'bg-bleu-500' : 'bg-bleu-100'}`} />
          <span className={`mt-2 hidden text-sm font-medium sm:block ${i === actuelle ? 'text-nuit' : i < actuelle ? 'text-encre-doux' : 'text-encre-pale'}`}>
            {i + 1}. {nom}
          </span>
        </li>
      ))}
    </ol>
  )
}

export default function PlanifierCollecte() {
  const navigate = useNavigate()
  const [etape, setEtape] = useState(0)
  const [camionId, setCamionId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [date, setDate] = useState(demainMatin)
  const [selection, setSelection] = useState([])
  const [plan, setPlan] = useState(null)
  const [notes, setNotes] = useState('')
  const [occupe, setOccupe] = useState(null) // 'suggestion' | 'optimiser' | 'creer'

  const camions = useDonnees(() => listerCamions({ statut: 'disponible' }), [])
  const zones = useDonnees(listerZones, [])
  const valides = useDonnees(() => listerSignalements({ statut: 'valide', zone_id: zoneId || undefined, limit: 100 }), [zoneId])

  const camion = camions.donnees?.find((c) => c.id === camionId)
  const zone = zones.donnees?.find((z) => z.id === zoneId)
  const signalements = valides.donnees?.signalements ?? []
  const choisis = useMemo(() => signalements.filter((s) => selection.includes(s.id)), [signalements, selection])
  const charge = choisis.reduce((t, s) => t + (POIDS_KG[s.urgence] ?? 120), 0)
  const depassement = camion && charge > camion.capacite_kg

  const basculer = (id) => {
    setPlan(null)
    setSelection((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  const suggerer = async () => {
    setOccupe('suggestion')
    try {
      const r = await suggestion(camionId, zoneId || undefined)
      setSelection(r.signalement_ids)
      setPlan(null)
      toast.success(`${pluriel(r.signalement_ids.length, 'signalement retenu', 'signalements retenus')} : ${kg(r.charge_estimee_kg)} sur ${kg(r.capacite_kg)}`)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setOccupe(null)
    }
  }

  const calculer = async () => {
    setOccupe('optimiser')
    try {
      setPlan(await optimiser(selection, camionId))
      setEtape(2)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setOccupe(null)
    }
  }

  const confirmer = async () => {
    setOccupe('creer')
    try {
      const c = await creerCollecte({
        camion_id: camionId,
        zone_id: zoneId || null,
        date_planifiee: new Date(date).toISOString(),
        // ordre de sélection : le serveur recalcule le même itinéraire et mesure le gain par rapport à lui
        signalement_ids: selection,
        notes: notes.trim() || undefined,
      })
      toast.success(`Tournée planifiée : ${c.nb_points} arrêts pour le camion ${c.camion_immatriculation}`)
      navigate('/agent/collectes', { replace: true, state: { ouverte: c.id } })
    } catch (err) {
      toast.error(messageErreur(err))
      setOccupe(null)
    }
  }

  const parId = useMemo(() => new Map(signalements.map((s) => [s.id, s])), [signalements])
  const etapesItineraire = plan?.itineraire.map((p) => ({ ...p, id: p.signalement_id })) ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold sm:text-[30px]">Planifier une tournée</h1>
        <p className="mt-1 text-encre-doux">Choisissez un camion et des signalements validés : l’itinéraire le plus court est calculé par les rues.</p>
      </div>
      <Etapes actuelle={etape} />

      <AnimatePresence mode="wait">
        <motion.div key={etape} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {/* ── Étape 1 : camion, zone, date ── */}
          {etape === 0 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <section className="carte p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Camion disponible</h2>
                {camions.chargement && <Chargement />}
                {camions.erreur && <Erreur message={camions.erreur} onReessayer={camions.recharger} />}
                {camions.donnees?.length === 0 && (
                  <Vide icone={Truck} titre="Aucun camion disponible" texte="Tous les camions sont en tournée ou en maintenance. Terminez ou annulez une tournée pour libérer un camion." />
                )}
                <div role="radiogroup" aria-label="Camion" className="mt-4 grid gap-3 sm:grid-cols-2">
                  {camions.donnees?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={camionId === c.id}
                      onClick={() => setCamionId(c.id)}
                      className={`rounded-xl border-2 p-4 text-left transition ${camionId === c.id ? 'border-bleu bg-bleu-50' : 'border-trait hover:border-bleu/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <Plaque numero={c.immatriculation} />
                        <Truck className={`h-5 w-5 ${camionId === c.id ? 'text-bleu-700' : 'text-encre-pale'}`} />
                      </div>
                      <p className="mt-2 text-sm text-encre-doux">{c.modele}</p>
                      <p className="mt-2 text-sm">
                        <span className="font-semibold">{kg(c.capacite_kg)}</span> · {c.chauffeur_nom ?? <span className="text-ambre-700">sans chauffeur</span>}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
              <section className="carte space-y-4 p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Zone et date</h2>
                <Champ libelle="Zone de collecte" aide="« Toute la ville » pour combiner plusieurs zones">
                  {(id) => (
                    <select
                      id={id}
                      className="champ"
                      value={zoneId}
                      onChange={(e) => {
                        setZoneId(e.target.value)
                        setSelection([])
                        setPlan(null)
                      }}
                    >
                      <option value="">Toute la ville</option>
                      {zones.donnees?.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nom} ({z.nb_a_traiter} à traiter)
                        </option>
                      ))}
                    </select>
                  )}
                </Champ>
                <Champ libelle="Départ prévu">{(id) => <input id={id} type="datetime-local" className="champ" value={date} onChange={(e) => setDate(e.target.value)} />}</Champ>
                <button type="button" className="btn-principal w-full" disabled={!camionId || !date} onClick={() => setEtape(1)}>
                  Choisir les signalements <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            </div>
          )}

          {/* ── Étape 2 : sélection ── */}
          {etape === 1 && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
              <div className="space-y-3">
                <Carte className="h-[380px] lg:h-[560px]">
                  <Zones zones={zones.donnees} surbrillance={zoneId} />
                  {signalements.map((s) => (
                    <MarqueurSignalement key={s.id} signalement={s} estompe={!selection.includes(s.id)} onClick={() => basculer(s.id)} />
                  ))}
                  {zone && <Cadrer points={[[zone.centre_lat, zone.centre_lng]]} max={15} />}
                </Carte>
                <p className="text-xs text-encre-pale">Touchez un marqueur pour l’ajouter ou le retirer. Les marqueurs pâles ne sont pas sélectionnés.</p>
              </div>

              <section className="carte flex flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold">{pluriel(signalements.length, 'signalement validé', 'signalements validés')}</h2>
                  <button type="button" className="btn-secondaire min-h-[36px]" onClick={suggerer} disabled={occupe === 'suggestion' || !signalements.length}>
                    {occupe === 'suggestion' ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    Sélection auto
                  </button>
                </div>
                <p className="mt-1 text-xs text-encre-pale">La sélection automatique prend les plus urgents d’abord, sans dépasser la capacité du camion.</p>

                {camion && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-encre-doux">Charge estimée</span>
                      <span className={`font-semibold tabular-nums ${depassement ? 'text-alerte-700' : 'text-nuit'}`}>
                        {kg(charge)} / {kg(camion.capacite_kg)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-bleu-100">
                      <div className={`h-full rounded-full transition-all ${depassement ? 'bg-alerte' : 'bg-bleu-500'}`} style={{ width: `${Math.min(100, (charge / camion.capacite_kg) * 100)}%` }} />
                    </div>
                    {depassement && <p className="mt-1 text-xs text-alerte-700">La charge dépasse la capacité : retirez des signalements ou choisissez un plus gros camion.</p>}
                  </div>
                )}

                {valides.chargement && <Chargement />}
                {!valides.chargement && signalements.length === 0 && (
                  <Vide icone={Check} titre="Aucun signalement validé" texte="Validez d’abord des signalements, ou choisissez une autre zone." action={<Link to="/agent/signalements" className="btn-secondaire">Valider des signalements</Link>} />
                )}
                <ul className="-mx-2 mt-4 max-h-[340px] flex-1 space-y-1 overflow-y-auto px-2">
                  {signalements.map((s) => (
                    <li key={s.id}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-2.5 transition ${selection.includes(s.id) ? 'bg-bleu-50' : 'hover:bg-bleu-50/50'}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-bleu" checked={selection.includes(s.id)} onChange={() => basculer(s.id)} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{s.description ?? 'Sans description'}</span>
                          <span className="block text-xs text-encre-pale">
                            {s.zone_nom ?? 'Hors zone'} · {ilYa(s.created_at)}
                          </span>
                        </span>
                        <UrgenceBadge urgence={s.urgence} compact />
                      </label>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex gap-2 border-t border-trait pt-4">
                  <button type="button" className="btn-discret" onClick={() => setEtape(0)}>
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                  <button type="button" className="btn-principal flex-1" disabled={!selection.length || depassement || occupe === 'optimiser'} onClick={calculer}>
                    {occupe === 'optimiser' ? <Spinner className="h-4 w-4 text-white" /> : <IconeRoute className="h-4 w-4" />}
                    Calculer l’itinéraire ({selection.length})
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ── Étape 3 : itinéraire optimisé ── */}
          {etape === 2 && plan && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
              <div className="space-y-3">
                <Carte className="h-[400px] lg:h-[580px]">
                  <Itineraire trace={plan.trace} traceNaive={plan.trace_naive} etapes={etapesItineraire} depart={plan.depart} />
                  <Cadrer points={plan.trace.length ? plan.trace : etapesItineraire.map((e) => [e.latitude, e.longitude])} marge={50} />
                </Carte>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-encre-doux">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-6 rounded bg-bleu-700" /> Itinéraire optimisé
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="w-6 border-t-2 border-dotted border-encre-pale" /> Ordre de sélection, pour comparer
                  </span>
                  {plan.depart && (
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-nuit text-[8px] font-bold">D</span> Départ du camion
                    </span>
                  )}
                </div>
              </div>

              <section className="space-y-4">
                <div className="rounded-carte bg-nuit p-5 text-white">
                  <p className="text-sm text-bleu-100/75">Distance économisée</p>
                  <p className="chiffre mt-1 text-[48px] leading-none text-ciel">−{Math.round(plan.gain_pourcent)} %</p>
                  <p className="mt-2 text-sm text-bleu-100/85">
                    {km(plan.distance_km)} au lieu de {km(plan.distance_naive_km)} dans l’ordre de sélection.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
                    <span className="flex items-center gap-2" title="Durée estimée">
                      <Clock className="h-4 w-4 shrink-0 text-ciel" />
                      {duree(plan.duree_estimee_min)} environ
                    </span>
                    <span className="flex items-center gap-2" title="Méthode de calcul des distances">
                      <Gauge className="h-4 w-4 shrink-0 text-ciel" />
                      {plan.methode === 'dijkstra' ? 'Par les rues (Dijkstra)' : 'À vol d’oiseau'}
                    </span>
                  </div>
                </div>

                <div className="carte p-5">
                  <h2 className="text-lg font-semibold">Ordre de passage</h2>
                  <ol className="mt-3 space-y-2">
                    {plan.itineraire.map((p) => {
                      const s = parId.get(p.signalement_id)
                      return (
                        <li key={p.signalement_id} className="flex items-center gap-3">
                          <span className="etape shrink-0 border-0 bg-nuit text-white shadow-none">{p.ordre}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{s?.description ?? 'Signalement'}</span>
                            <span className="block text-xs text-encre-pale">{s?.zone_nom ?? 'Hors zone'}</span>
                          </span>
                          <UrgenceBadge urgence={p.urgence} compact />
                        </li>
                      )
                    })}
                  </ol>
                  <div className="mt-5 flex gap-2 border-t border-trait pt-4">
                    <button type="button" className="btn-discret" onClick={() => setEtape(1)}>
                      <ArrowLeft className="h-4 w-4" /> Modifier
                    </button>
                    <button type="button" className="btn-principal flex-1" onClick={() => setEtape(3)}>
                      Continuer <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* ── Étape 4 : confirmation ── */}
          {etape === 3 && plan && (
            <div className="mx-auto max-w-2xl">
              <section className="carte p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Récapitulatif</h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[
                    ['Camion', `${camion?.immatriculation} · ${camion?.modele ?? ''}`],
                    ['Chauffeur', camion?.chauffeur_nom ?? 'Aucun chauffeur affecté'],
                    ['Zone', zone?.nom ?? 'Toute la ville'],
                    ['Départ', new Date(date).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })],
                    ['Arrêts', pluriel(plan.itineraire.length, 'signalement')],
                    ['Distance', `${km(plan.distance_km)} · ${duree(plan.duree_estimee_min)} environ`],
                  ].map(([cle, valeur]) => (
                    <div key={cle} className="rounded-xl bg-bleu-50 px-4 py-3">
                      <dt className="text-xs text-encre-pale">{cle}</dt>
                      <dd className="mt-0.5 font-medium text-nuit">{valeur}</dd>
                    </div>
                  ))}
                </dl>
                <Champ libelle="Instructions pour le chauffeur" aide="Facultatif : accès difficile, horaires du marché…" className="mt-5">
                  {(id) => <textarea id={id} rows={3} className="champ" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />}
                </Champ>
                {!camion?.chauffeur_nom && <p className="mt-3 rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">Ce camion n’a pas de chauffeur : la tournée ne pourra démarrer qu’après son affectation par l’administrateur.</p>}
                <div className="mt-6 flex gap-2">
                  <button type="button" className="btn-discret" onClick={() => setEtape(2)}>
                    <ArrowLeft className="h-4 w-4" /> Retour
                  </button>
                  <button type="button" className="btn-principal min-h-[48px] flex-1 text-base" onClick={confirmer} disabled={occupe === 'creer'}>
                    {occupe === 'creer' ? <Spinner className="h-4 w-4 text-white" /> : <Check className="h-5 w-5" />}
                    Planifier la tournée
                  </button>
                </div>
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

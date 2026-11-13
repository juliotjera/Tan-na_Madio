// Planifier une collecte (version d'origine, 4 étapes) :
// 1. Sélection : camion (chauffeur, WhatsApp, appel), zone, mode de planification, date
// 2. Signalements : signalements validés de la zone (photo, adresse, déclarant, date, urgence)
// 3. Aperçu : itinéraire Dijkstra par les rues sur la carte, ordre de passage, gain
// 4. Confirmation : récapitulatif, signalements inclus, consignes pour le chauffeur
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, ImageOff, Info, List, Map as IconeCarte, MapPin, MessageCircle, Phone, Sparkles, Truck } from 'lucide-react'
import { creerCollecte, listerCamions, listerSignalements, listerZones, optimiser, repartition, suggestion } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { UrgenceBadge } from '../../components/common/Badge'
import { Chargement, Spinner } from '../../components/common/ui'
import { dateCourte, duree, kg, km, pluriel } from '../../utils/format'
import { T } from '../../context/LangueContext'

const ETAPES = [
  ['Étape 1', 'Sélection'],
  ['Étape 2', 'Signalements'],
  ['Étape 3', 'Aperçu'],
  ['Étape 4', 'Confirmation'],
]
const POIDS_KG = { faible: 50, moyen: 120, eleve: 250, critique: 400 } // mêmes estimations que le serveur
const COULEURS_TOURNEES = ['#3B82F6', '#8B5CF6', '#F97316', '#0EA5E9', '#EC4899']

function demainMatin() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(7, 30, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// 033 44 555 66 → 261334455566 (format international pour WhatsApp et l'appel)
const international = (tel) => {
  const chiffres = (tel ?? '').replace(/\D/g, '')
  return chiffres.startsWith('261') ? chiffres : chiffres.replace(/^0/, '261')
}

function Etapes({ actuelle }) {
  return (
    <ol className="mb-6 grid grid-cols-4 gap-2 sm:gap-4" aria-label="Étapes">
      {ETAPES.map(([titre, nom], i) => (
        <li
          key={titre}
          aria-current={i === actuelle ? 'step' : undefined}
          className={`rounded-xl border-[1.5px] px-2 py-3 text-center transition ${
            i < actuelle ? 'border-vert-500 bg-vert-50' : i === actuelle ? 'border-ardoise/60 bg-white shadow-carte' : 'border-trait bg-white'
          }`}
        >
          <p className="text-sm font-bold text-ardoise">{titre}</p>
          <p className="hidden text-xs text-encre-doux sm:block">{nom}</p>
        </li>
      ))}
    </ol>
  )
}

function ChampVert({ libelle, icone: Icone, requis, aide, valide, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ardoise">
        {Icone && <Icone className="h-4 w-4 text-encre-doux" />}
        {libelle}
        {requis && <span className="text-alerte">*</span>}
      </span>
      <div className="relative">
        {children}
        {valide && <CheckCircle2 className="pointer-events-none absolute right-10 top-1/2 h-5 w-5 -translate-y-1/2 text-vert-500" />}
      </div>
      {aide && <span className="mt-1.5 block text-xs text-encre-doux">{aide}</span>}
    </label>
  )
}

function CaseRecap({ libelle, valeur, ton }) {
  const tons = { bleu: 'bg-blue-50 text-blue-700', vert: 'bg-vert-50 text-vert-700', violet: 'bg-violet-50 text-violet-700', ambre: 'bg-ambre-50 text-ambre-700', ciel: 'bg-sky-50 text-sky-700' }
  return (
    <div className={`rounded-xl px-4 py-3 ${tons[ton]}`}>
      <p className="text-xs font-medium">{libelle}</p>
      <p className="mt-0.5 font-titre text-lg font-bold">{valeur}</p>
    </div>
  )
}

export default function PlanifierCollecte() {
  const navigate = useNavigate()
  const lieu = useLocation()
  const [etape, setEtape] = useState(0)
  const [camionId, setCamionId] = useState('')
  const [zoneId, setZoneId] = useState(() => lieu.state?.zoneId ?? '') // zone choisie depuis le tableau de bord
  const [mode, setMode] = useState('mono') // 'mono' (Dijkstra, un camion) | 'multi' (glouton, plusieurs camions)
  const [date, setDate] = useState(demainMatin)
  const [selection, setSelection] = useState([])
  const [plan, setPlan] = useState(null) // mode mono
  const [repartie, setRepartie] = useState(null) // mode multi : { tournees, non_attribues }
  const [notes, setNotes] = useState('')
  const [occupe, setOccupe] = useState(null)

  const camions = useDonnees(() => listerCamions({ statut: 'disponible' }), [])
  const zones = useDonnees(listerZones, [])
  const valides = useDonnees(() => listerSignalements({ statut: 'valide', zone_id: zoneId || undefined, limit: 100 }), [zoneId])

  const camion = camions.donnees?.find((c) => c.id === camionId)
  const zone = zones.donnees?.find((z) => z.id === zoneId)
  const signalements = useMemo(() => valides.donnees?.signalements ?? [], [valides.donnees])
  const parId = useMemo(() => new Map(signalements.map((s) => [s.id, s])), [signalements])
  const choisis = signalements.filter((s) => selection.includes(s.id))
  const charge = choisis.reduce((t, s) => t + (POIDS_KG[s.urgence] ?? 120), 0)
  const depassement = mode === 'mono' && camion && charge > camion.capacite_kg
  const etape1Ok = date && (mode === 'multi' || camionId)

  const basculer = (id) => {
    setPlan(null)
    setRepartie(null)
    setSelection((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  const suggerer = async () => {
    setOccupe('suggestion')
    try {
      const r = await suggestion(camionId, zoneId || undefined)
      setSelection(r.signalement_ids)
      toast.success(`${pluriel(r.signalement_ids.length, 'signalement retenu', 'signalements retenus')} : ${kg(r.charge_estimee_kg)} sur ${kg(r.capacite_kg)}`)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setOccupe(null)
    }
  }

  const calculer = async () => {
    setOccupe('calcul')
    try {
      if (mode === 'mono') setPlan(await optimiser(selection, camionId))
      else setRepartie(await repartition(selection))
      setEtape(2)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setOccupe(null)
    }
  }

  const confirmer = async () => {
    setOccupe('creer')
    const commun = { zone_id: zoneId || null, date_planifiee: new Date(date).toISOString(), notes: notes.trim() || undefined }
    try {
      if (mode === 'mono') {
        // ordre de sélection : le serveur recalcule le même itinéraire et mesure le gain par rapport à lui
        const c = await creerCollecte({ ...commun, camion_id: camionId, signalement_ids: selection })
        toast.success(`Collecte créée : ${c.nb_points} points pour le camion ${c.camion_immatriculation}`)
      } else {
        for (const t of repartie.tournees) await creerCollecte({ ...commun, camion_id: t.camion.id, signalement_ids: t.signalement_ids })
        toast.success(`${pluriel(repartie.tournees.length, 'collecte créée', 'collectes créées')}`)
      }
      navigate('/agent/collectes', { replace: true })
    } catch (err) {
      toast.error(messageErreur(err))
      setOccupe(null)
    }
  }

  // aperçu : une ou plusieurs tournées
  const tournees = mode === 'mono' && plan ? [{ camion, plan }] : (repartie?.tournees ?? [])
  const totalKm = tournees.reduce((s, t) => s + t.plan.distance_km, 0)
  const totalMin = tournees.reduce((s, t) => s + t.plan.duree_estimee_min, 0)
  const nbPoints = tournees.reduce((s, t) => s + t.plan.itineraire.length, 0)
  const cadre = tournees.flatMap((t) => (t.plan.trace.length ? t.plan.trace : t.plan.itineraire.map((p) => [p.latitude, p.longitude])))

  return (
    <div className="mx-auto max-w-[1060px]">
      <div className="mb-6">
        <h1 className="text-[28px]">Planifier une collecte</h1>
        <p className="mt-1 text-encre-doux">Configuration étape par étape d’une nouvelle tournée</p>
      </div>
      <Etapes actuelle={etape} />

      <AnimatePresence mode="wait">
        <motion.div key={etape} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="carte p-5 sm:p-7">
          {/* ── Étape 1 : sélection ── */}
          {etape === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl">Sélectionnez la zone et le camion</h2>
              <ChampVert libelle="Mode de planification" icone={Clock} aide="Le mode glouton répartit les signalements sur plusieurs camions si nécessaire, sans dépasser leur capacité." valide>
                <select className="champ appearance-auto" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="mono">Planification mono-tournée (Dijkstra)</option>
                  <option value="multi">Plusieurs tournées (glouton, camions disponibles)</option>
                </select>
              </ChampVert>

              {mode === 'mono' && (
                <>
                  <ChampVert libelle="Camion" icone={Truck} requis valide={Boolean(camion)}>
                    <select className="champ appearance-auto" value={camionId} onChange={(e) => setCamionId(e.target.value)}>
                      <option value="">Sélectionner un camion</option>
                      {camions.donnees?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.immatriculation} - {c.modele ?? 'Camion'} ({c.capacite_kg.toLocaleString('fr-FR')} kg) — {c.chauffeur_nom ?? 'sans chauffeur'}
                        </option>
                      ))}
                    </select>
                  </ChampVert>
                  {camions.donnees?.length === 0 && <p className="text-sm text-ambre-700">Aucun camion disponible : terminez ou annulez une tournée pour libérer un camion.</p>}
                  {camion && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                      {camion.chauffeur_nom ? (
                        <>
                          <p className="text-sm text-blue-900">
                            <span className="font-semibold">Chauffeur assigné :</span> {camion.chauffeur_nom}
                          </p>
                          <p className="mt-2 text-xs text-blue-800">Contact :</p>
                          <p className="text-sm tracking-wide text-blue-900">{camion.chauffeur_telephone ?? 'Numéro non renseigné'}</p>
                          {camion.chauffeur_telephone && (
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <a href={`https://wa.me/${international(camion.chauffeur_telephone)}`} target="_blank" rel="noreferrer" className="btn bg-[#0B8A5E] text-white hover:bg-[#08704C]">
                                <MessageCircle className="h-4 w-4" /> WhatsApp
                              </a>
                              <a href={`tel:+${international(camion.chauffeur_telephone)}`} className="btn border border-trait bg-white text-ardoise hover:bg-fond">
                                <Phone className="h-4 w-4" /> Appel
                              </a>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-ambre-700">Ce camion n’a pas de chauffeur : la tournée ne pourra démarrer qu’après son affectation par l’administrateur.</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <ChampVert
                libelle="Zone"
                icone={MapPin}
                aide={zone ? `Signalements disponibles dans cette zone : ${zone.nb_valides}` : `Signalements validés dans toute la ville : ${zones.donnees?.reduce((s, z) => s + z.nb_valides, 0) ?? '—'}`}
                valide={Boolean(zone)}
              >
                <select
                  className="champ appearance-auto"
                  value={zoneId}
                  onChange={(e) => {
                    setZoneId(e.target.value)
                    setSelection([])
                  }}
                >
                  <option value="">Toute la ville</option>
                  {zones.donnees?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nom}
                    </option>
                  ))}
                </select>
              </ChampVert>

              <ChampVert libelle="Date planifiée" icone={CalendarDays} requis valide={Boolean(date)}>
                <input type="datetime-local" className="champ" value={date} onChange={(e) => setDate(e.target.value)} />
              </ChampVert>

              <div className="flex justify-end gap-3 border-t border-trait pt-5">
                <button type="button" className="btn-secondaire" onClick={() => navigate('/agent')}>
                  <T>Annuler</T>
                </button>
                <button type="button" className="btn-accent" disabled={!etape1Ok} onClick={() => setEtape(1)}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 2 : signalements ── */}
          {etape === 1 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl">
                  <List className="h-5 w-5" /> Sélectionnez les signalements ({selection.length}/{signalements.length})
                </h2>
                {mode === 'mono' && (
                  <button type="button" className="btn-secondaire min-h-[38px]" onClick={suggerer} disabled={occupe === 'suggestion' || !signalements.length}>
                    {occupe === 'suggestion' ? <Spinner className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />} Sélection automatique
                  </button>
                )}
                {mode === 'multi' && (
                  <button type="button" className="btn-secondaire min-h-[38px]" onClick={() => setSelection(signalements.map((s) => s.id))} disabled={!signalements.length}>
                    Tout sélectionner
                  </button>
                )}
              </div>
              {mode === 'mono' && camion && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-encre-doux">Charge estimée du camion {camion.immatriculation}</span>
                    <span className={`font-semibold tabular-nums ${depassement ? 'text-alerte-700' : 'text-ardoise'}`}>
                      {kg(charge)} / {kg(camion.capacite_kg)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-vert-100">
                    <div className={`h-full rounded-full transition-all ${depassement ? 'bg-alerte' : 'bg-vert-500'}`} style={{ width: `${Math.min(100, (charge / camion.capacite_kg) * 100)}%` }} />
                  </div>
                  {depassement && <p className="mt-1 text-xs text-alerte-700">La charge dépasse la capacité : retirez des signalements, choisissez un plus gros camion ou passez en mode « plusieurs tournées ».</p>}
                </div>
              )}

              {valides.chargement && <Chargement />}
              {!valides.chargement && signalements.length === 0 && (
                <p className="mt-6 rounded-xl bg-fond px-4 py-6 text-center text-encre-doux">Aucun signalement validé {zone ? 'dans cette zone' : ''}. Validez d’abord des signalements.</p>
              )}
              <ul className="mt-5 space-y-3">
                {signalements.map((s) => {
                  const coche = selection.includes(s.id)
                  return (
                    <li key={s.id}>
                      <label className={`flex cursor-pointer gap-4 rounded-xl border-[1.5px] p-4 transition ${coche ? 'border-vert-500 bg-vert-50/50' : 'border-trait hover:border-vert-300'}`}>
                        <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#10B981]" checked={coche} onChange={() => basculer(s.id)} />
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-fond">
                          {s.photo_url ? (
                            <img src={s.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-encre-pale">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                          <div className="min-w-0">
                            <p className="text-xs text-encre-pale">Adresse</p>
                            <p className="truncate text-sm font-medium">{s.adresse ?? `${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}`}</p>
                            <p className="mt-1 truncate text-sm text-encre-doux">{s.description ?? 'Sans description'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-encre-pale">Signalé par</p>
                            <p className="text-sm font-medium">{s.citoyen_nom ?? 'Citoyen'}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <UrgenceBadge urgence={s.urgence} compact />
                              <span className="text-xs text-encre-pale">{dateCourte(s.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 flex justify-between gap-3 border-t border-trait pt-5">
                <button type="button" className="btn-secondaire" onClick={() => setEtape(0)}>
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button type="button" className="btn-accent" disabled={!selection.length || depassement || occupe === 'calcul'} onClick={calculer}>
                  {occupe === 'calcul' ? <Spinner className="h-4 w-4 text-white" /> : null} Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 3 : aperçu de la route ── */}
          {etape === 2 && tournees.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-xl">
                <IconeCarte className="h-5 w-5" /> Aperçu de la route
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <CaseRecap libelle="Zone" valeur={zone?.nom ?? 'Toute la ville'} ton="bleu" />
                <CaseRecap libelle="Signalements" valeur={nbPoints} ton="vert" />
                <CaseRecap libelle="Distance totale" valeur={km(totalKm)} ton="violet" />
                <CaseRecap libelle="Durée estimée" valeur={duree(totalMin)} ton="ciel" />
                <CaseRecap libelle={tournees.length > 1 ? 'Camions' : 'Camion'} valeur={tournees.map((t) => t.camion.immatriculation).join(', ')} ton="ambre" />
              </div>

              <div className="relative isolate mt-4">
                <Carte className="h-[420px]">
                  {tournees.map((t, i) => (
                    <Itineraire
                      key={t.camion.id}
                      trace={t.plan.trace}
                      traceNaive={tournees.length === 1 ? t.plan.trace_naive : undefined}
                      etapes={t.plan.itineraire.map((p) => ({ ...p, id: p.signalement_id }))}
                      depart={t.plan.depart}
                      couleur={COULEURS_TOURNEES[i % COULEURS_TOURNEES.length]}
                    />
                  ))}
                  <Cadrer points={cadre} marge={50} />
                </Carte>
                <div className="absolute right-3 top-3 z-10 rounded-xl bg-white/95 px-4 py-3 text-xs shadow-carte">
                  <p className="mb-1 font-semibold"><T>Légende</T></p>
                  {tournees.map((t, i) => (
                    <p key={t.camion.id} className="flex items-center gap-2">
                      <span className="h-1 w-5 rounded" style={{ background: COULEURS_TOURNEES[i % COULEURS_TOURNEES.length] }} /> Itinéraire {tournees.length > 1 ? t.camion.immatriculation : 'optimisé'}
                    </p>
                  ))}
                  {tournees.length === 1 && (
                    <p className="flex items-center gap-2">
                      <span className="w-5 border-t-2 border-dotted border-encre-pale" /> Ordre de sélection
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4B5563] text-[8px] font-bold text-white">1</span> Ordre de passage
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-trait p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-vert-500" /> Itinéraire optimisé
                  </p>
                  <p className="mt-1 text-sm text-encre-doux">
                    {tournees.length === 1 && plan
                      ? `−${Math.round(plan.gain_pourcent)} % : ${km(plan.distance_km)} au lieu de ${km(plan.distance_naive_km)} dans l’ordre de sélection.`
                      : `${tournees.length} tournées, chacune ordonnée au plus court.`}
                  </p>
                </div>
                <div className="rounded-xl border border-trait p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2.5 w-2.5 rounded-full bg-alerte" /> Marqueurs signalements
                  </p>
                  <p className="mt-1 text-sm text-encre-doux">Les marqueurs numérotés indiquent l’ordre de visite.</p>
                </div>
                <div className="rounded-xl border border-trait p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Info className="h-4 w-4 text-blue-500" /> Informations
                  </p>
                  <p className="mt-1 text-sm text-encre-doux">
                    {tournees[0].plan.methode === 'dijkstra' ? 'Distances calculées par les rues (Dijkstra).' : 'Distances estimées à vol d’oiseau.'}
                  </p>
                </div>
              </div>
              {repartie?.non_attribues?.length > 0 && (
                <p className="mt-3 rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">
                  {pluriel(repartie.non_attribues.length, 'signalement ne tient', 'signalements ne tiennent')} dans aucun camion disponible : il{repartie.non_attribues.length > 1 ? 's restent' : ' reste'} à planifier.
                </p>
              )}

              <div className="mt-6 flex justify-between gap-3 border-t border-trait pt-5">
                <button type="button" className="btn-secondaire" onClick={() => setEtape(1)}>
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button type="button" className="btn-accent" onClick={() => setEtape(3)}>
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 4 : confirmation ── */}
          {etape === 3 && tournees.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-xl">
                <CheckCircle2 className="h-5 w-5" /> Confirmez les détails
              </h2>
              <dl className="mt-4 grid gap-4 rounded-xl bg-fond/70 p-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-encre-pale"><T>Zone</T></dt>
                  <dd className="font-semibold">{zone?.nom ?? 'Toute la ville'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-encre-pale">{tournees.length > 1 ? 'Camions' : 'Camion'}</dt>
                  <dd className="font-semibold">{tournees.map((t) => t.camion.immatriculation).join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-encre-pale">{tournees.length > 1 ? 'Chauffeurs assignés' : 'Chauffeur assigné'}</dt>
                  <dd className="font-semibold">{tournees.map((t) => t.camion.chauffeur_nom ?? 'Non assigné').join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-xs text-encre-pale"><T>Date planifiée</T></dt>
                  <dd className="font-semibold">{new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
                </div>
                <div>
                  <dt className="text-xs text-encre-pale">Signalements</dt>
                  <dd className="font-semibold">{nbPoints}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-xl border border-vert-300 bg-vert-50 p-4 text-sm text-vert-700">
                <p className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="h-4 w-4 text-alerte" /> Itinéraire optimisé
                </p>
                <p>Distance totale : {km(totalKm)}</p>
                <p>Durée estimée : {duree(totalMin)}</p>
                <p>Points de collecte : {nbPoints}</p>
              </div>

              <p className="mt-5 text-sm font-semibold">Signalements inclus</p>
              <div className="mt-2 space-y-4">
                {tournees.map((t, i) => (
                  <div key={t.camion.id}>
                    {tournees.length > 1 && (
                      <p className="mb-1 flex items-center gap-2 text-sm font-semibold" style={{ color: COULEURS_TOURNEES[i % COULEURS_TOURNEES.length] }}>
                        <Truck className="h-4 w-4" /> {t.camion.immatriculation} — {pluriel(t.plan.itineraire.length, 'point')}, {km(t.plan.distance_km)}
                      </p>
                    )}
                    <ol className="space-y-1.5">
                      {t.plan.itineraire.map((p) => {
                        const s = parId.get(p.signalement_id)
                        return (
                          <li key={p.signalement_id} className="flex items-center gap-3 rounded-lg bg-fond/70 px-3 py-2">
                            <span className="etape h-6 w-6 shrink-0 border-0 bg-[#4B5563] text-[11px] text-white shadow-none">{p.ordre}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm">{s?.description ?? 'Signalement'}</span>
                              <span className="block text-xs text-encre-pale">{s?.zone_nom ?? 'Hors zone'}</span>
                            </span>
                            <UrgenceBadge urgence={p.urgence} compact />
                          </li>
                        )
                      })}
                    </ol>
                  </div>
                ))}
              </div>

              <label className="mt-5 block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-encre-doux" /> Notes (optionnel)
                </span>
                <textarea rows={3} maxLength={1000} className="champ" placeholder="Instructions particulières pour le chauffeur..." value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>

              <div className="mt-6 flex justify-between gap-3 border-t border-trait pt-5">
                <button type="button" className="btn-secondaire" onClick={() => setEtape(2)}>
                  <ChevronLeft className="h-4 w-4" /> Retour
                </button>
                <button type="button" className="btn-principal" onClick={confirmer} disabled={occupe === 'creer'}>
                  {occupe === 'creer' ? <Spinner className="h-4 w-4 text-white" /> : <Check className="h-4 w-4" />}
                  {tournees.length > 1 ? `Créer les ${tournees.length} collectes` : 'Créer la collecte'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

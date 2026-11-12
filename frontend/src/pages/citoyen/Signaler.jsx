// « Signaler un problème » (formulaire de la version d'origine) : description, adresse, urgence,
// localisation (GPS, carte ou recherche), photo réduite avant l'envoi, puis Envoyer / Annuler.
// Si un dépôt est déjà signalé à moins de 50 m, le citoyen peut le confirmer (« Moi aussi ») au lieu de créer un doublon.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertCircle, CheckCircle2, ImagePlus, MapPin, Send, ThumbsUp, Trash2, Users } from 'lucide-react'
import { CircleMarker, Marker, Tooltip } from 'react-leaflet'
import { envoyerSignalement, signalementsProches, soutenirSignalement } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { usePosition } from '../../hooks/usePosition'
import { useLangue } from '../../context/LangueContext'
import { AuClic, Cadrer, Carte, CENTRE_TANA, iconeUrgence } from '../../components/map/Carte'
import RechercheAdresse from '../../components/map/RechercheAdresse'
import { StatutBadge } from '../../components/common/Badge'
import { Spinner } from '../../components/common/ui'
import { compresserPhoto } from '../../utils/image'

const NIVEAUX = [
  ['faible', 'Faible - Peu gênant'],
  ['moyen', 'Moyen - À ramasser cette semaine'],
  ['eleve', 'Élevé - Gêne importante'],
  ['critique', 'Critique - Danger sanitaire'],
]

// Champ à étiquette posée sur la bordure, avec message « Valide » / erreur sous le champ
function ChampCadre({ libelle, requis, aide, valide, erreur, children }) {
  const { t } = useLangue()
  return (
    <div>
      <div
        className={`relative rounded-xl border-[1.5px] bg-white px-3.5 pb-2.5 pt-3 transition focus-within:border-vert-500 ${
          erreur ? 'border-alerte' : valide ? 'border-vert-500' : 'border-trait'
        }`}
      >
        <span className={`absolute -top-2.5 left-3 bg-white px-1 text-xs font-semibold ${erreur ? 'text-alerte-700' : 'text-vert'}`}>
          {libelle}
          {requis && <span className="text-alerte"> *</span>}
        </span>
        {children}
      </div>
      {aide && <p className="mt-1.5 text-xs text-encre-doux">{aide}</p>}
      {erreur ? (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-alerte-700">
          <AlertCircle className="h-4 w-4" /> {erreur}
        </p>
      ) : (
        valide && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-vert">
            <CheckCircle2 className="h-4 w-4" /> {t('Valide')}
          </p>
        )
      )}
    </div>
  )
}

export default function Signaler() {
  const navigate = useNavigate()
  const { t } = useLangue()
  const gps = usePosition()
  const [photo, setPhoto] = useState(null)
  const [apercu, setApercu] = useState(null)
  const [urgence, setUrgence] = useState('moyen')
  const [description, setDescription] = useState('')
  const [adresse, setAdresse] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [tente, setTente] = useState(false) // erreurs affichées après une première tentative d'envoi
  const [envoi, setEnvoi] = useState(null) // progression 0-100
  const [resultat, setResultat] = useState(null)
  const [proches, setProches] = useState([])
  const [soutien, setSoutien] = useState(null)
  const entree = useRef(null)
  const { localiser } = gps

  useEffect(() => localiser(), [localiser]) // position demandée dès l'ouverture
  useEffect(() => () => apercu && URL.revokeObjectURL(apercu), [apercu])
  // la position GPS ou le clic sur la carte remplissent les champs latitude / longitude
  useEffect(() => {
    if (gps.position) {
      setLat(String(gps.position[0]))
      setLng(String(gps.position[1]))
    }
  }, [gps.position])

  const latN = Number(lat)
  const lngN = Number(lng)
  const positionOk = lat !== '' && lng !== '' && Number.isFinite(latN) && Number.isFinite(lngN) && Math.abs(latN) <= 90 && Math.abs(lngN) <= 180
  const position = positionOk ? [latN, lngN] : null
  const descriptionOk = description.trim().length >= 3

  // doublons : recherche des signalements ouverts autour du point, après une courte pause
  useEffect(() => {
    if (!positionOk) return setProches([])
    let actif = true
    const minuterie = setTimeout(() => {
      signalementsProches(latN, lngN)
        .then((liste) => actif && setProches(liste))
        .catch(() => actif && setProches([]))
    }, 600)
    return () => {
      actif = false
      clearTimeout(minuterie)
    }
  }, [positionOk, latN, lngN])

  const confirmer = async (s) => {
    setSoutien(s.id)
    try {
      await soutenirSignalement(s.id)
      toast.success(t('Merci ! Votre confirmation fait remonter ce dépôt dans la planification.'))
      navigate('/citoyen')
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setSoutien(null)
    }
  }

  const choisirPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reduite = await compresserPhoto(f)
    if (reduite.size > 5 * 1024 * 1024) return toast.error('Photo trop lourde (5 Mo au maximum)')
    setPhoto(reduite)
    setApercu(URL.createObjectURL(reduite))
  }

  const placer = ([la, lo]) => {
    gps.setPosition([la, lo])
    gps.setPrecision(null)
  }

  const envoyer = async (e) => {
    e.preventDefault()
    setTente(true)
    if (!positionOk || !descriptionOk) return
    setEnvoi(0)
    try {
      const r = await envoyerSignalement({ latitude: latN, longitude: lngN, urgence, description: description.trim(), adresse: adresse.trim() }, photo, setEnvoi)
      setResultat(r)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(null)
    }
  }

  if (resultat) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-vert-100 text-vert-500">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-[28px]">{t('Signalement envoyé')}</h1>
        <p className="mt-2 text-encre-doux">
          {resultat.zone_nom ? `${resultat.zone_nom}. ` : ''}
          {t('Un agent municipal va le vérifier. Vous serez crédité de 5 points à la validation.')}
        </p>
        <p className="chiffre mt-6 text-[40px] text-vert-500">+{resultat.points_gagnes} {t('points')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/citoyen/signalements" className="btn-principal">
            {t('Suivre mon signalement')}
          </Link>
          <button
            type="button"
            className="btn-secondaire"
            onClick={() => {
              setResultat(null)
              setPhoto(null)
              setApercu(null)
              setDescription('')
              setAdresse('')
              setUrgence('moyen')
              setTente(false)
            }}
          >
            {t('Signaler un autre dépôt')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={envoyer} className="mx-auto max-w-[620px] space-y-5" noValidate>
      <div>
        <h1 className="text-[28px]">{t('Signaler un problème')}</h1>
        <p className="mt-1 text-encre-doux">{t('Aidez-nous à maintenir votre quartier propre')}</p>
      </div>

      <ChampCadre
        libelle={t('Description')}
        requis
        aide={t('Décrivez le problème (déchets, encombrants, etc.)')}
        valide={descriptionOk}
        erreur={tente && !descriptionOk ? t('Ce champ est requis.') : null}
      >
        <textarea rows={4} maxLength={2000} className="w-full resize-y border-0 p-0 text-[15px] outline-none" value={description} onChange={(e) => setDescription(e.target.value)} />
      </ChampCadre>

      <ChampCadre libelle={t('Adresse')} aide={t('Optionnel, mais utile pour la collecte')} valide={adresse.trim().length > 1}>
        <input className="w-full border-0 p-0 text-[15px] outline-none" maxLength={255} value={adresse} onChange={(e) => setAdresse(e.target.value)} />
      </ChampCadre>

      <label className="block">
        <span className="etiquette">{t("Niveau d'urgence")}</span>
        <select className="champ" value={urgence} onChange={(e) => setUrgence(e.target.value)}>
          {NIVEAUX.map(([v, l]) => (
            <option key={v} value={v}>
              {t(l)}
            </option>
          ))}
        </select>
      </label>

      <section className="rounded-carte bg-fond/80 p-4">
        <p className="etiquette">{t('Localisation')}</p>
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <ChampCadre libelle={t('Latitude')} requis valide={positionOk}>
            <input inputMode="decimal" className="w-full border-0 p-0 text-[15px] outline-none" value={lat} onChange={(e) => setLat(e.target.value)} />
          </ChampCadre>
          <ChampCadre libelle={t('Longitude')} requis valide={positionOk}>
            <input inputMode="decimal" className="w-full border-0 p-0 text-[15px] outline-none" value={lng} onChange={(e) => setLng(e.target.value)} />
          </ChampCadre>
        </div>
        {tente && !positionOk && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-alerte-700">
            <AlertCircle className="h-4 w-4" /> {t('Ce champ est requis.')}
          </p>
        )}
        <button type="button" className="btn-secondaire mt-3 w-full" onClick={gps.localiser} disabled={gps.recherche}>
          {gps.recherche ? <Spinner className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} {t('Utiliser ma position')}
        </button>
        {gps.erreur && !position && <p className="mt-2 text-sm text-ambre-700">{gps.erreur}</p>}

        <div className="mt-4 overflow-hidden rounded-xl border border-trait bg-white">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold">{t('Placez un marqueur sur la carte')}</p>
            <p className="text-xs text-encre-doux">{t('Cliquez sur la carte pour définir la latitude et la longitude.')}</p>
          </div>
          <div className="px-3">
            <RechercheAdresse
              onChoix={(p, nom) => {
                placer(p)
                if (!adresse) setAdresse(nom.slice(0, 255))
              }}
            />
          </div>
          <Carte className="h-[260px] rounded-none border-0 border-t" centre={position ?? CENTRE_TANA} zoom={16}>
            <AuClic onClic={placer} />
            {position && (
              <Marker
                position={position}
                icon={iconeUrgence(urgence)}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat: la, lng: lo } = e.target.getLatLng()
                    placer([la, lo])
                  },
                }}
              />
            )}
            {proches.map((p) => (
              <CircleMarker key={p.id} center={[p.latitude, p.longitude]} radius={8} pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: '#F59E0B', fillOpacity: 0.95 }}>
                <Tooltip>{p.description ?? t('Dépôt déjà signalé')}</Tooltip>
              </CircleMarker>
            ))}
            {position && <Cadrer points={[position]} max={17} />}
          </Carte>
        </div>

        {proches.length > 0 && (
          <div className="mt-4 rounded-xl border border-ambre/50 bg-ambre-50 p-4" role="status">
            <p className="font-semibold text-ambre-700">{t('Ce dépôt a peut-être déjà été signalé')}</p>
            <p className="mt-0.5 text-sm text-encre-doux">{t('Si c’est le même, confirmez-le : il sera ramassé plus vite, sans doublon.')}</p>
            <ul className="mt-3 space-y-2">
              {proches.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-fond text-encre-pale">
                      <MapPin className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.description ?? p.adresse ?? t('Dépôt signalé')}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-encre-doux">
                      <span>{t('à {n} m', { n: p.distance_m })}</span>
                      <StatutBadge statut={p.statut} />
                      {p.nb_soutiens > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> +{p.nb_soutiens}
                        </span>
                      )}
                    </p>
                  </div>
                  {p.moi ? (
                    <span className="shrink-0 text-xs text-encre-pale">{t('Votre signalement')}</span>
                  ) : p.deja_soutenu ? (
                    <span className="shrink-0 text-xs font-semibold text-vert">{t('Déjà confirmé')}</span>
                  ) : (
                    <button type="button" className="btn-secondaire min-h-[38px] shrink-0 px-3" disabled={soutien === p.id} onClick={() => confirmer(p)}>
                      {soutien === p.id ? <Spinner className="h-4 w-4" /> : <ThumbsUp className="h-4 w-4" />} {t('Moi aussi')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-carte bg-fond/80 p-4">
        <p className="etiquette">{t('Photo (optionnel)')}</p>
        <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={choisirPhoto} />
        {apercu ? (
          <div className="relative mt-2 overflow-hidden rounded-xl">
            <img src={apercu} alt="Aperçu de la photo" className="max-h-[320px] w-full object-cover" />
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-alerte text-white shadow hover:bg-alerte-700"
              onClick={() => {
                setPhoto(null)
                setApercu(null)
                entree.current.value = ''
              }}
              aria-label="Retirer la photo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => entree.current.click()}
            className="mt-2 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-vert-300 bg-white px-6 py-8 text-encre-doux transition hover:bg-vert-50"
          >
            <ImagePlus className="h-7 w-7 text-vert-500" />
            <span className="font-semibold text-vert">{t('Prendre ou choisir une photo')}</span>
            <span className="text-xs">{t('JPEG, PNG ou WebP · réduite automatiquement avant l’envoi')}</span>
          </button>
        )}
      </section>

      <div className="grid gap-3 pb-4 sm:grid-cols-2">
        <button type="submit" className="btn-principal min-h-[48px] text-base" disabled={envoi != null}>
          {envoi != null ? <Spinner className="h-4 w-4 text-white" /> : <Send className="h-4 w-4" />}
          {envoi != null ? t('Envoi… {p} %', { p: envoi }) : t('Envoyer')}
        </button>
        <button type="button" className="btn-secondaire min-h-[48px] text-base" onClick={() => navigate(-1)}>
          {t('Annuler')}
        </button>
      </div>
    </form>
  )
}

// Signaler un dépôt : position (GPS ou carte), photo, urgence, précisions — puis envoi
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Camera, CheckCircle2, Crosshair, ImagePlus, MapPin, X } from 'lucide-react'
import { Marker } from 'react-leaflet'
import { envoyerSignalement } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { usePosition } from '../../hooks/usePosition'
import { AuClic, Cadrer, Carte, CENTRE_TANA, iconeUrgence } from '../../components/map/Carte'
import { Champ, Spinner } from '../../components/common/ui'
import { compresserPhoto } from '../../utils/image'
import { URGENCES } from '../../utils/format'

const AIDES_URGENCE = {
  faible: 'Quelques sacs, pas de gêne immédiate',
  moyen: 'Tas visible, à ramasser cette semaine',
  eleve: 'Gros dépôt, odeurs, gêne pour le passage',
  critique: 'Danger : près d’une école, d’un point d’eau, ou feu',
}

function Bloc({ numero, titre, fait, children }) {
  return (
    <section className="carte p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full font-titre text-sm font-bold ${fait ? 'bg-feuille text-foret' : 'bg-foret text-white'}`}>
          {fait ? <CheckCircle2 className="h-4 w-4" /> : numero}
        </span>
        <h2 className="text-lg font-semibold">{titre}</h2>
      </div>
      {children}
    </section>
  )
}

export default function Signaler() {
  const navigate = useNavigate()
  const gps = usePosition()
  const [photo, setPhoto] = useState(null)
  const [apercu, setApercu] = useState(null)
  const [urgence, setUrgence] = useState('moyen')
  const [description, setDescription] = useState('')
  const [adresse, setAdresse] = useState('')
  const [envoi, setEnvoi] = useState(null) // progression 0-100
  const [resultat, setResultat] = useState(null)
  const entree = useRef(null)
  const { localiser } = gps

  useEffect(() => localiser(), [localiser]) // position demandée dès l'ouverture
  useEffect(() => () => apercu && URL.revokeObjectURL(apercu), [apercu])

  const choisirPhoto = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reduite = await compresserPhoto(f)
    if (reduite.size > 5 * 1024 * 1024) return toast.error('Photo trop lourde (5 Mo au maximum)')
    setPhoto(reduite)
    setApercu(URL.createObjectURL(reduite))
  }

  const pret = gps.position && (photo || description.trim())

  const envoyer = async () => {
    setEnvoi(0)
    try {
      const r = await envoyerSignalement(
        { latitude: gps.position[0], longitude: gps.position[1], urgence, description: description.trim(), adresse: adresse.trim() },
        photo,
        setEnvoi,
      )
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
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-feuille text-foret">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-[28px] font-semibold">Signalement envoyé</h1>
        <p className="mt-2 text-encre-doux">
          {resultat.zone_nom ? `Il a été rattaché à la zone ${resultat.zone_nom}. ` : ''}Un agent municipal va le vérifier. Vous serez crédité de 5 points à la validation.
        </p>
        <p className="chiffre mt-6 text-[40px] text-feuille-700">+{resultat.points_gagnes} points</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/citoyen/signalements" className="btn-principal">
            Suivre mon signalement
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
            }}
          >
            Signaler un autre dépôt
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold sm:text-[30px]">Signaler un dépôt d’ordures</h1>
        <p className="mt-1 text-encre-doux">Placez le point, ajoutez une photo, indiquez l’urgence.</p>
      </div>

      <Bloc numero={1} titre="Où se trouve le dépôt ?" fait={Boolean(gps.position)}>
        <Carte className="h-[300px] sm:h-[340px]" centre={gps.position ?? CENTRE_TANA} zoom={16}>
          <AuClic
            onClic={(p) => {
              gps.setPosition(p)
              gps.setPrecision(null)
            }}
          />
          {gps.position && (
            <Marker
              position={gps.position}
              icon={iconeUrgence(urgence)}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = e.target.getLatLng()
                  gps.setPosition([lat, lng])
                  gps.setPrecision(null)
                },
              }}
            />
          )}
          {gps.position && <Cadrer points={[gps.position]} max={17} />}
        </Carte>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-encre-doux">
            <MapPin className="h-4 w-4 text-foret-700" />
            {gps.recherche
              ? 'Recherche de votre position…'
              : gps.position
                ? `${gps.position[0].toFixed(5)}, ${gps.position[1].toFixed(5)}${gps.precision ? ` · précision ${gps.precision} m` : ''}`
                : 'Touchez la carte pour placer le point'}
          </p>
          <button type="button" className="btn-secondaire min-h-[38px]" onClick={gps.localiser} disabled={gps.recherche}>
            {gps.recherche ? <Spinner className="h-4 w-4" /> : <Crosshair className="h-4 w-4" />}
            Ma position
          </button>
        </div>
        {gps.erreur && !gps.position && <p className="mt-2 text-sm text-ambre-700">{gps.erreur}</p>}
        <p className="mt-2 text-xs text-encre-pale">Vous pouvez déplacer le marqueur pour être plus précis.</p>
      </Bloc>

      <Bloc numero={2} titre="Une photo du dépôt" fait={Boolean(photo)}>
        <input ref={entree} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={choisirPhoto} />
        {apercu ? (
          <div className="relative overflow-hidden rounded-xl">
            <img src={apercu} alt="Aperçu de la photo" className="max-h-[360px] w-full object-cover" />
            <button
              type="button"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-foret/80 text-white backdrop-blur hover:bg-foret"
              onClick={() => {
                setPhoto(null)
                setApercu(null)
                entree.current.value = ''
              }}
              aria-label="Retirer la photo"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => entree.current.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-trait bg-feuille-50/50 px-6 py-10 text-encre-doux transition hover:border-feuille-600 hover:bg-feuille-50"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-foret-700 shadow-carte">
              <Camera className="h-6 w-6" />
            </span>
            <span className="font-semibold text-foret">Prendre ou choisir une photo</span>
            <span className="text-xs">JPEG, PNG ou WebP · réduite automatiquement avant l’envoi</span>
          </button>
        )}
        {apercu && (
          <button type="button" onClick={() => entree.current.click()} className="btn-discret mt-2">
            <ImagePlus className="h-4 w-4" /> Changer de photo
          </button>
        )}
      </Bloc>

      <Bloc numero={3} titre="Quelle urgence ?" fait>
        <div role="radiogroup" aria-label="Niveau d'urgence" className="grid gap-2 sm:grid-cols-2">
          {Object.entries(URGENCES).map(([cle, u]) => (
            <button
              key={cle}
              type="button"
              role="radio"
              aria-checked={urgence === cle}
              onClick={() => setUrgence(cle)}
              className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition ${urgence === cle ? 'border-foret-700 bg-feuille-50' : 'border-trait hover:border-foret-700/30'}`}
            >
              <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: u.couleur }} />
              <span>
                <span className="block font-semibold text-foret">{u.libelle}</span>
                <span className="block text-sm text-encre-doux">{AIDES_URGENCE[cle]}</span>
              </span>
            </button>
          ))}
        </div>
      </Bloc>

      <Bloc numero={4} titre="Précisions" fait={Boolean(description.trim())}>
        <div className="space-y-4">
          <Champ libelle="Description" aide={photo ? 'Facultatif' : 'Obligatoire sans photo'}>
            {(id) => (
              <textarea id={id} rows={3} maxLength={2000} className="champ resize-y" placeholder="Ex. : tas d’ordures devant l’entrée du marché" value={description} onChange={(e) => setDescription(e.target.value)} />
            )}
          </Champ>
          <Champ libelle="Repère ou adresse" aide="Facultatif : rue, bâtiment, arrêt de taxi-be…">
            {(id) => <input id={id} className="champ" maxLength={255} value={adresse} onChange={(e) => setAdresse(e.target.value)} />}
          </Champ>
        </div>
      </Bloc>

      <div className="sticky bottom-[84px] z-30 flex flex-col gap-2 rounded-2xl border border-trait bg-white/95 p-3 shadow-flotte backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <p className="px-2 text-sm text-encre-doux">{!gps.position ? 'Placez d’abord le point sur la carte' : !pret ? 'Ajoutez une photo ou une description' : 'Prêt à envoyer'}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-discret" onClick={() => navigate(-1)}>
            Annuler
          </button>
          <button type="button" className="btn-principal min-h-[46px] flex-1 px-6 sm:flex-none" disabled={!pret || envoi != null} onClick={envoyer}>
            {envoi != null && <Spinner className="h-4 w-4 text-white" />}
            {envoi != null ? `Envoi… ${envoi} %` : 'Envoyer le signalement'}
          </button>
        </div>
      </div>
    </div>
  )
}

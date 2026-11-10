// Zones de collecte : contours sur la carte, fréquence de passage, création par tracé
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Trash2, Undo2 } from 'lucide-react'
import { Polygon, Polyline, CircleMarker } from 'react-leaflet'
import { creerZone, listerZones, modifierZone, supprimerZone } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { AuClic, Cadrer, Carte, Zones as CalqueZones } from '../../components/map/Carte'
import { Champ, Chargement, Confirmation, EnTete, Erreur, Spinner } from '../../components/common/ui'
import { pluriel } from '../../utils/format'

const VIDE = { nom: '', description: '', frequence_collecte_jours: '7', actif: true }

export default function Zones() {
  const zones = useDonnees(listerZones, [])
  const [edition, setEdition] = useState(null) // null : liste ; {} : nouvelle ; zone : modification
  const [f, setF] = useState(VIDE)
  const [points, setPoints] = useState([])
  const [envoi, setEnvoi] = useState(false)
  const [aSupprimer, setASupprimer] = useState(null)
  const [suppression, setSuppression] = useState(false)
  const [survol, setSurvol] = useState(null)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const ouvrir = (z) => {
    setEdition(z ?? {})
    setPoints([])
    setF(z ? { nom: z.nom, description: z.description ?? '', frequence_collecte_jours: String(z.frequence_collecte_jours ?? 7), actif: z.actif } : VIDE)
  }

  const enregistrer = async (e) => {
    e.preventDefault()
    if (!edition.id && points.length < 3) return toast.error('Tracez le contour : au moins 3 points sur la carte')
    setEnvoi(true)
    const champs = { ...f, frequence_collecte_jours: Number(f.frequence_collecte_jours), ...(points.length >= 3 && { points }) }
    try {
      const z = edition.id ? await modifierZone(edition.id, champs) : await creerZone(champs)
      toast.success(edition.id ? `Zone ${z.nom} modifiée` : `Zone ${z.nom} créée`)
      setEdition(null)
      zones.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async () => {
    setSuppression(true)
    try {
      await supprimerZone(aSupprimer.id)
      toast.success(`Zone ${aSupprimer.nom} supprimée`)
      setASupprimer(null)
      zones.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setSuppression(false)
    }
  }

  const trace = edition !== null
  const enEdition = edition?.id ? zones.donnees?.find((z) => z.id === edition.id) : null

  return (
    <div>
      <EnTete
        titre="Zones de collecte"
        texte="Chaque signalement est rattaché automatiquement à la zone qui contient son point GPS."
        actions={
          !trace && (
            <button type="button" className="btn-principal" onClick={() => ouvrir(null)}>
              <Plus className="h-4 w-4" /> Nouvelle zone
            </button>
          )
        }
      />
      {zones.erreur && <Erreur message={zones.erreur} onReessayer={zones.recharger} />}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <Carte className="h-[420px] xl:h-[600px]" zoom={14}>
            <CalqueZones zones={zones.donnees?.filter((z) => z.id !== enEdition?.id || points.length < 3)} surbrillance={survol ?? enEdition?.id} />
            {trace && <AuClic onClic={(p) => setPoints((pts) => [...pts, p])} />}
            {points.length >= 3 && <Polygon positions={points} pathOptions={{ color: '#E8A317', weight: 2.5, fillOpacity: 0.15 }} />}
            {points.length === 2 && <Polyline positions={points} pathOptions={{ color: '#E8A317', weight: 2.5 }} />}
            {points.map((p, i) => (
              <CircleMarker key={i} center={p} radius={5} pathOptions={{ color: '#FFFFFF', weight: 2, fillColor: '#9A6200', fillOpacity: 1 }} />
            ))}
            {enEdition && <Cadrer points={[[enEdition.centre_lat, enEdition.centre_lng]]} max={15} />}
          </Carte>
          {trace && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-encre-doux">
              <span>{points.length ? `${pluriel(points.length, 'point')} placé${points.length > 1 ? 's' : ''}` : edition.id ? 'Touchez la carte pour redessiner le contour (facultatif)' : 'Touchez la carte pour placer les coins de la zone'}</span>
              {points.length > 0 && (
                <>
                  <button type="button" className="btn-discret min-h-[34px]" onClick={() => setPoints((pts) => pts.slice(0, -1))}>
                    <Undo2 className="h-4 w-4" /> Retirer le dernier
                  </button>
                  <button type="button" className="btn-discret min-h-[34px]" onClick={() => setPoints([])}>
                    Effacer
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {trace ? (
          <form onSubmit={enregistrer} className="carte h-fit space-y-4 p-5">
            <h2 className="text-lg font-semibold">{edition.id ? `Modifier ${edition.nom}` : 'Nouvelle zone'}</h2>
            <Champ libelle="Nom">{(id) => <input id={id} className="champ" value={f.nom} onChange={maj('nom')} required placeholder="Ex. : Mahamasina" />}</Champ>
            <Champ libelle="Description" aide="Facultatif">
              {(id) => <textarea id={id} rows={2} className="champ" value={f.description} onChange={maj('description')} />}
            </Champ>
            <Champ libelle="Passage du camion tous les… (jours)">
              {(id) => <input id={id} type="number" min="1" max="60" className="champ" value={f.frequence_collecte_jours} onChange={maj('frequence_collecte_jours')} required />}
            </Champ>
            {edition.id && (
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-bleu" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} />
                Zone active (les nouveaux signalements y sont rattachés)
              </label>
            )}
            <div className="flex gap-2 border-t border-trait pt-4">
              <button type="button" className="btn-secondaire" onClick={() => setEdition(null)}>
                Annuler
              </button>
              <button type="submit" className="btn-principal flex-1" disabled={envoi}>
                {envoi && <Spinner className="h-4 w-4 text-white" />}
                Enregistrer
              </button>
            </div>
          </form>
        ) : (
          <ul className="space-y-3">
            {zones.chargement && !zones.donnees && <Chargement />}
            {zones.donnees?.map((z) => (
              <li key={z.id} className={`carte p-4 transition ${z.actif ? '' : 'opacity-60'}`} onMouseEnter={() => setSurvol(z.id)} onMouseLeave={() => setSurvol(null)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-titre text-lg font-semibold text-nuit">
                      {z.nom}
                      {!z.actif && <span className="ml-2 text-xs font-normal text-encre-pale">inactive</span>}
                    </p>
                    {z.description && <p className="text-sm text-encre-doux">{z.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="btn-discret min-h-[34px] px-2" onClick={() => ouvrir(z)} aria-label={`Modifier ${z.nom}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-discret min-h-[34px] px-2 hover:text-alerte-700" onClick={() => setASupprimer(z)} aria-label={`Supprimer ${z.nom}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-encre-doux">
                  <span>Tous les {z.frequence_collecte_jours} jours</span>
                  <span>{pluriel(z.nb_signalements, 'signalement')}</span>
                  <span className={z.nb_a_traiter ? 'font-medium text-ambre-700' : ''}>{z.nb_a_traiter} à traiter</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Confirmation
        ouvert={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        enCours={suppression}
        danger
        titre={`Supprimer la zone ${aSupprimer?.nom ?? ''} ?`}
        texte="Les signalements et collectes de la zone sont conservés, mais ne seront plus rattachés à aucune zone. Pour la mettre en pause, désactivez-la plutôt."
        action="Supprimer"
      />
    </div>
  )
}

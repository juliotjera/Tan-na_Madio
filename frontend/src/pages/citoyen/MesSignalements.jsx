// Mes signalements : suivi étape par étape, jusqu'au ramassage
import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Camera, ImageOff, Inbox, Trash2 } from 'lucide-react'
import { mesSignalements, supprimerSignalement } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chargement, Confirmation, EnTete, Erreur, Pagination, Segments, Vide } from '../../components/common/ui'
import { dateHeure, ilYa } from '../../utils/format'

const FILTRES = [
  { valeur: '', libelle: 'Tous' },
  { valeur: 'en_attente', libelle: 'En attente' },
  { valeur: 'valide', libelle: 'Validés' },
  { valeur: 'en_cours', libelle: 'En tournée' },
  { valeur: 'collecte', libelle: 'Collectés' },
  { valeur: 'rejete', libelle: 'Rejetés' },
]

const PARCOURS = ['en_attente', 'valide', 'en_cours', 'collecte']
const NOMS = { en_attente: 'Envoyé', valide: 'Validé', en_cours: 'En tournée', collecte: 'Ramassé' }

// Avancement : les quatre étapes du signalement
function Parcours({ statut }) {
  if (statut === 'rejete') return <p className="text-sm text-encre-doux">Ce signalement n’a pas été retenu par la commune (doublon ou dépôt déjà ramassé).</p>
  const atteint = PARCOURS.indexOf(statut)
  return (
    <ol className="flex items-center gap-1.5" aria-label="Avancement">
      {PARCOURS.map((etape, i) => (
        <li key={etape} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1.5 rounded-full ${i <= atteint ? 'bg-bleu-500' : 'bg-bleu-100'}`} />
          <span className={`text-[11px] font-medium ${i <= atteint ? 'text-nuit' : 'text-encre-pale'}`}>{NOMS[etape]}</span>
        </li>
      ))}
    </ol>
  )
}

export default function MesSignalements() {
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [aSupprimer, setASupprimer] = useState(null)
  const [suppression, setSuppression] = useState(false)
  const liste = useDonnees(() => mesSignalements({ statut: statut || undefined, page, limit: 10 }), [statut, page], { intervalle: 60000 })

  const supprimer = async () => {
    setSuppression(true)
    try {
      await supprimerSignalement(aSupprimer.id)
      toast.success('Signalement supprimé')
      setASupprimer(null)
      liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setSuppression(false)
    }
  }

  return (
    <div>
      <EnTete
        titre="Mes signalements"
        texte="Suivez chacun de vos signalements jusqu’au passage du camion."
        actions={
          <Link to="/citoyen/signaler" className="btn-principal">
            <Camera className="h-4 w-4" /> Nouveau signalement
          </Link>
        }
      />
      <div className="mb-5 overflow-x-auto">
        <Segments
          options={FILTRES}
          valeur={statut}
          onChange={(v) => {
            setStatut(v)
            setPage(1)
          }}
          libelle="Filtrer par statut"
        />
      </div>

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}
      {liste.donnees?.signalements.length === 0 && (
        <div className="carte">
          <Vide
            icone={Inbox}
            titre={statut ? 'Aucun signalement avec ce statut' : 'Vous n’avez encore rien signalé'}
            texte="Un dépôt d’ordures dans votre rue ? Signalez-le en trente secondes."
            action={
              <Link to="/citoyen/signaler" className="btn-principal">
                Signaler un dépôt
              </Link>
            }
          />
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {liste.donnees?.signalements.map((s) => (
          <li key={s.id} className="carte flex flex-col overflow-hidden sm:flex-row">
            <div className="h-40 shrink-0 bg-bleu-50 sm:h-auto sm:w-36">
              {s.photo_url ? (
                <img src={s.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full items-center justify-center text-encre-pale">
                  <ImageOff className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatutBadge statut={s.statut} />
                <UrgenceBadge urgence={s.urgence} compact />
              </div>
              <div>
                <p className="font-medium text-encre">{s.description ?? 'Sans description'}</p>
                <p className="mt-0.5 text-xs text-encre-pale" title={dateHeure(s.created_at)}>
                  {[s.adresse, s.zone_nom].filter(Boolean).join(' · ') || 'Hors zone de collecte'} · {ilYa(s.created_at)}
                </p>
              </div>
              <div className="mt-auto flex items-end gap-3">
                <div className="flex-1">
                  <Parcours statut={s.statut} />
                </div>
                {s.statut === 'en_attente' && (
                  <button type="button" className="btn-discret min-h-[36px] px-2 text-encre-pale hover:text-alerte-700" onClick={() => setASupprimer(s)} aria-label="Supprimer ce signalement">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={10} onChange={setPage} />}

      <Confirmation
        ouvert={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        enCours={suppression}
        danger
        titre="Supprimer ce signalement ?"
        texte="Il disparaîtra de la carte et ne pourra pas être récupéré. Les 2 points de l’envoi restent acquis."
        action="Supprimer"
      />
    </div>
  )
}

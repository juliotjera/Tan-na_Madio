// Journal d'activité : qui a fait quoi et quand (connexions, validations, tournées, comptes…)
import { useEffect, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { journal } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { Chargement, EnTete, Erreur, Pagination, Vide } from '../../components/common/ui'
import { dateHeure, ROLES } from '../../utils/format'
import { T } from '../../context/LangueContext'

// libellés lisibles des actions enregistrées par l'API
const ACTIONS = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  export: 'Export CSV',
  inscription: 'Inscription',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
  activation: 'Activation d’un compte',
  desactivation: 'Désactivation d’un compte',
  changement_statut: 'Changement de statut',
  changement_mot_de_passe: 'Changement de mot de passe',
  reinitialisation_mot_de_passe: 'Mot de passe réinitialisé',
  soutien: '« Moi aussi » sur un signalement',
  demarrage: 'Tournée démarrée',
  point_collecte: 'Point collecté',
  fin: 'Tournée terminée',
  annulation: 'Tournée annulée',
}
const ENTITES = { '': 'Tout', signalement: 'Signalements', collecte: 'Collectes', utilisateur: 'Comptes', camion: 'Camions', zone: 'Zones' }
const STATUTS = { en_attente: 'en attente', valide: 'validé', rejete: 'rejeté', en_cours: 'en tournée', collecte: 'ramassé' }

const libelleAction = (a) => ACTIONS[a] ?? a.replaceAll('_', ' ')

// détails utiles selon l'action, en une phrase courte
function details(l) {
  const d = l.details ?? {}
  if (l.action === 'changement_statut') return `${STATUTS[d.de] ?? d.de} → ${STATUTS[d.vers] ?? d.vers}${d.motif ? ` (${d.motif})` : ''}`
  if (d.role) return ROLES[d.role] ?? d.role
  if (d.email) return d.email
  if (d.urgence) return `urgence ${d.urgence}`
  if (d.points_collectes != null) return `${d.points_collectes} points collectés${d.poids_collecte_kg ? `, ${d.poids_collecte_kg} kg` : ''}`
  if (d.nb_points != null) return `${d.nb_points} points`
  return ''
}

export default function Journal() {
  const [action, setAction] = useState('')
  const [entite, setEntite] = useState('')
  const [q, setQ] = useState('')
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(1)
  const liste = useDonnees(() => journal({ action: action || undefined, entite: entite || undefined, q: recherche || undefined, page, limit: 25 }), [action, entite, recherche, page])

  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(q.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const d = liste.donnees
  return (
    <div>
      <EnTete titre="Journal d’activité" texte="Toutes les actions importantes, avec leur auteur et leur date" />

      <div className="carte mb-5 grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-encre-doux">Action</span>
          <select
            className="champ"
            value={action}
            onChange={(e) => {
              setAction(e.target.value)
              setPage(1)
            }}
          >
            <option value=""><T>Toutes</T></option>
            {d?.actions?.map((a) => (
              <option key={a} value={a}>
                {libelleAction(a)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-encre-doux">Sur</span>
          <select
            className="champ"
            value={entite}
            onChange={(e) => {
              setEntite(e.target.value)
              setPage(1)
            }}
          >
            {Object.entries(ENTITES).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="relative text-sm">
          <span className="mb-1 block text-encre-doux">Auteur</span>
          <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-encre-pale" />
          <input type="search" className="champ pl-9" placeholder="Nom ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !d && <Chargement />}
      {d?.logs.length === 0 && (
        <div className="carte">
          <Vide icone={ScrollText} titre="Aucune action" texte="Aucune action ne correspond à ces filtres." />
        </div>
      )}
      {d?.logs.length > 0 && (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[760px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Auteur</th>
                <th>Action</th>
                <th>Détail</th>
                <th>Adresse IP</th>
              </tr>
            </thead>
            <tbody>
              {d.logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-encre-doux">{dateHeure(l.created_at)}</td>
                  <td>
                    <p className="font-medium">{l.utilisateur ?? 'Compte supprimé'}</p>
                    {l.role && <p className="text-xs text-encre-pale">{ROLES[l.role]}</p>}
                  </td>
                  <td>
                    {libelleAction(l.action)}
                    {l.entite && <span className="text-encre-pale"> · {l.entite}</span>}
                  </td>
                  <td className="text-encre-doux">{details(l)}</td>
                  <td className="font-mono text-xs text-encre-pale">{l.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {d && <Pagination page={page} total={d.total} limit={25} onChange={setPage} />}
    </div>
  )
}

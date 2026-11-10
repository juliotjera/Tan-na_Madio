// Collectes : toutes les tournées, leur avancement, et l'annulation d'une tournée pas encore partie
import { Plaque } from '../../components/layout/Logo'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ListChecks, Route } from 'lucide-react'
import { annulerCollecte, collecte as chargerCollecte, listerCollectes } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import BoutonExport from '../../components/common/BoutonExport'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chargement, Confirmation, EnTete, Erreur, Modal, Pagination, Segments, Vide } from '../../components/common/ui'
import { dateHeure, duree, jourHeure, kg, km } from '../../utils/format'

const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'planifiee', libelle: 'Planifiées' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminee', libelle: 'Terminées' },
  { valeur: 'annulee', libelle: 'Annulées' },
]

export function Avancement({ faits, total }) {
  const part = total ? faits / total : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-bleu-100">
        <div className="h-full rounded-full bg-bleu-500" style={{ width: `${part * 100}%` }} />
      </div>
      <span className="text-xs tabular-nums text-encre-doux">
        {faits}/{total}
      </span>
    </div>
  )
}

export default function Collectes() {
  const lieu = useLocation()
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)
  const [ouverte, setOuverte] = useState(lieu.state?.ouverte ?? null)
  const [aAnnuler, setAAnnuler] = useState(false)
  const [annulation, setAnnulation] = useState(false)
  const liste = useDonnees(() => listerCollectes({ statut: statut || undefined, page, limit: 15 }), [statut, page], { intervalle: 30000 })
  const detail = useDonnees(() => (ouverte ? chargerCollecte(ouverte) : null), [ouverte])
  const c = detail.donnees

  const annuler = async () => {
    setAnnulation(true)
    try {
      await annulerCollecte(c.id)
      toast.success('Tournée annulée : les signalements sont de nouveau à planifier')
      setAAnnuler(false)
      detail.recharger({ silencieux: true })
      liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setAnnulation(false)
    }
  }

  return (
    <div>
      <EnTete
        titre="Collectes"
        texte="Les tournées planifiées, en cours et passées."
        actions={
          <>
            <BoutonExport ressource="collectes" params={{ statut: statut || undefined }} />
            <Link to="/agent/planifier" className="btn-principal">
              <Route className="h-4 w-4" /> Planifier une tournée
            </Link>
          </>
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
          libelle="Statut"
        />
      </div>
      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}
      {liste.donnees?.collectes.length === 0 && (
        <div className="carte">
          <Vide icone={ListChecks} titre="Aucune tournée" texte="Les tournées que vous planifiez apparaîtront ici." />
        </div>
      )}

      {liste.donnees?.collectes.length > 0 && (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[720px]">
            <thead>
              <tr>
                <th>Départ</th>
                <th>Camion</th>
                <th>Zone</th>
                <th>Avancement</th>
                <th>Distance</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {liste.donnees.collectes.map((x) => (
                <tr key={x.id} className="cursor-pointer" onClick={() => setOuverte(x.id)}>
                  <td className="font-medium">
                    <button type="button" className="text-left hover:underline" onClick={() => setOuverte(x.id)}>
                      {jourHeure(x.date_planifiee)}
                    </button>
                  </td>
                  <td>
                    <Plaque numero={x.camion_immatriculation} />
                  </td>
                  <td>{x.zone_nom ?? 'Toute la ville'}</td>
                  <td>
                    <Avancement faits={x.nb_faits} total={x.nb_points} />
                  </td>
                  <td className="tabular-nums">{km(x.distance_km)}</td>
                  <td>
                    <StatutBadge statut={x.statut} type="collecte" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={15} onChange={setPage} />}

      <Modal
        ouvert={Boolean(ouverte)}
        onFermer={() => setOuverte(null)}
        titre={c ? `Tournée du ${dateHeure(c.date_planifiee)}` : 'Tournée'}
        large
        pied={
          c?.statut === 'planifiee' && (
            <button type="button" className="btn-danger" onClick={() => setAAnnuler(true)}>
              Annuler la tournée
            </button>
          )
        }
      >
        {detail.chargement && <Chargement />}
        {c && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatutBadge statut={c.statut} type="collecte" />
              <span className="text-sm text-encre-doux">
                {c.camion_immatriculation} · {c.zone_nom ?? 'Toute la ville'} · planifiée par {c.agent_nom}
              </span>
            </div>
            <Carte className="h-[300px]">
              <Itineraire trace={c.itineraire?.trace} etapes={c.signalements} depart={c.itineraire?.depart} anime={false} />
              <Cadrer points={c.itineraire?.trace?.length ? c.itineraire.trace : c.signalements.map((s) => [s.latitude, s.longitude])} />
            </Carte>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Distance', km(c.distance_km)],
                ['Durée estimée', duree(c.itineraire?.duree_estimee_min)],
                ['Gain', c.itineraire?.gain_pourcent != null ? `−${Math.round(c.itineraire.gain_pourcent)} %` : '—'],
                ['Collecté', c.poids_collecte_kg != null ? kg(c.poids_collecte_kg) : `${c.nb_faits}/${c.nb_points} points`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-bleu-50 px-3 py-2.5">
                  <p className="text-xs text-encre-pale">{k}</p>
                  <p className="font-semibold text-nuit">{v}</p>
                </div>
              ))}
            </div>
            {c.notes && <p className="rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">{c.notes}</p>}
            <ol className="divide-y divide-trait">
              {c.signalements.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className={`etape shrink-0 border-0 shadow-none ${s.collecte_fait ? 'bg-ciel text-nuit' : 'bg-nuit text-white'}`}>{s.collecte_fait ? '✓' : s.ordre}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{s.description ?? s.adresse ?? 'Signalement'}</span>
                  <UrgenceBadge urgence={s.urgence} compact />
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>

      <Confirmation
        ouvert={aAnnuler}
        onFermer={() => setAAnnuler(false)}
        onConfirmer={annuler}
        enCours={annulation}
        danger
        titre="Annuler cette tournée ?"
        texte="Le camion redevient disponible et les signalements reviennent dans la liste à planifier."
        action="Annuler la tournée"
      />
    </div>
  )
}

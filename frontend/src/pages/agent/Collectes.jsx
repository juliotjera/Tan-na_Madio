// Gestion des collectes (version d'origine) : filtres par statut, liste « Collecte du … » avec camion et distance,
// boutons Annuler (tournée pas encore partie) et Détails
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ListChecks, Route, Ruler, Truck } from 'lucide-react'
import { annulerCollecte, collecte as chargerCollecte, listerCollectes } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import BoutonExport from '../../components/common/BoutonExport'
import { Cadrer, Carte, Itineraire } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chargement, Confirmation, EnTete, Erreur, Modal, Pagination, Segments, Vide } from '../../components/common/ui'
import { duree, kg } from '../../utils/format'
import { T } from '../../context/LangueContext'

const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'planifiee', libelle: 'Planifiée' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminee', libelle: 'Terminée' },
  { valeur: 'annulee', libelle: 'Annulée' },
]

const dateFr = (d) => new Date(d).toLocaleDateString('fr-FR')
const distance = (v) => `${Number(v ?? 0).toFixed(2)} km`

export function Avancement({ faits, total }) {
  const part = total ? faits / total : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-vert-100">
        <div className="h-full rounded-full bg-vert-500" style={{ width: `${part * 100}%` }} />
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
  const [aAnnuler, setAAnnuler] = useState(null) // id de la tournée à annuler
  const [annulation, setAnnulation] = useState(false)
  const liste = useDonnees(() => listerCollectes({ statut: statut || undefined, page, limit: 15 }), [statut, page], { intervalle: 30000 })
  const detail = useDonnees(() => (ouverte ? chargerCollecte(ouverte) : null), [ouverte])
  const c = detail.donnees

  const annuler = async () => {
    setAnnulation(true)
    try {
      await annulerCollecte(aAnnuler)
      toast.success('Tournée annulée : les signalements sont de nouveau à planifier')
      setAAnnuler(null)
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
        titre="Gestion des Collectes"
        texte="Planifiez et suivez les collectes"
        actions={
          <>
            <BoutonExport ressource="collectes" params={{ statut: statut || undefined }} />
            <Link to="/agent/planifier" className="btn-principal">
              <Route className="h-4 w-4" /> <T>Planifier une tournée</T>
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
        <ul className="carte divide-y divide-trait">
          {liste.donnees.collectes.map((x) => (
            <li key={x.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ardoise">
                  Collecte du {dateFr(x.date_planifiee)} <StatutBadge statut={x.statut} type="collecte" />
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-encre-doux">
                  <Truck className="h-4 w-4" /> {x.camion_immatriculation ?? 'Camion non assigné'}
                  {x.zone_nom && <span className="text-encre-pale">· {x.zone_nom}</span>}
                </p>
                <p className="mt-0.5 flex items-center gap-2 text-sm text-encre-doux">
                  <Ruler className="h-4 w-4" /> Distance : {distance(x.distance_km)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm text-encre-doux">
                  {x.nb_faits}/{x.nb_points} signalements
                </span>
                {x.statut === 'planifiee' && (
                  <button type="button" className="btn min-h-[38px] bg-alerte text-white hover:bg-red-700" onClick={() => setAAnnuler(x.id)}>
                    <T>Annuler</T>
                  </button>
                )}
                <button type="button" className="btn-secondaire min-h-[38px]" onClick={() => setOuverte(x.id)}>
                  <T>Détails</T>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={15} onChange={setPage} />}

      <Modal
        ouvert={Boolean(ouverte)}
        onFermer={() => setOuverte(null)}
        titre="Détails de la collecte"
        large
        pied={
          c?.statut === 'planifiee' && (
            <button type="button" className="btn-danger" onClick={() => setAAnnuler(c.id)}>
              Annuler la tournée
            </button>
          )
        }
      >
        {detail.chargement && <Chargement />}
        {c && (
          <div className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                ['Date', dateFr(c.date_planifiee)],
                ['Camion', c.camion_immatriculation ?? 'Non assigné'],
                ['Zone', c.zone_nom ?? 'Non définie'],
                ['Statut', <StatutBadge key="s" statut={c.statut} type="collecte" />],
                ['Signalements traités', c.nb_faits],
                ['Distance', distance(c.distance_km)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-sm text-encre-doux">{k}</dt>
                  <dd className="mt-0.5 text-lg text-ardoise">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-encre-doux">Planifiée par {c.agent_nom}</p>
            <Carte className="h-[300px]">
              <Itineraire trace={c.itineraire?.trace} etapes={c.signalements} depart={c.itineraire?.depart} anime={false} />
              <Cadrer points={c.itineraire?.trace?.length ? c.itineraire.trace : c.signalements.map((s) => [s.latitude, s.longitude])} />
            </Carte>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Points', `${c.nb_points}`],
                ['Durée estimée', duree(c.itineraire?.duree_estimee_min)],
                ['Gain', c.itineraire?.gain_pourcent != null ? `−${Math.round(c.itineraire.gain_pourcent)} %` : '—'],
                ['Collecté', c.poids_collecte_kg != null ? kg(c.poids_collecte_kg) : `${c.nb_faits}/${c.nb_points} points`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-vert-50 px-3 py-2.5">
                  <p className="text-xs text-encre-pale">{k}</p>
                  <p className="font-semibold text-ardoise">{v}</p>
                </div>
              ))}
            </div>
            {c.notes && <p className="rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">{c.notes}</p>}
            <ol className="divide-y divide-trait">
              {c.signalements.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <span className={`etape shrink-0 border-0 shadow-none ${s.collecte_fait ? 'bg-menthe text-ardoise' : 'bg-ardoise text-white'}`}>{s.collecte_fait ? '✓' : s.ordre}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{s.description ?? s.adresse ?? 'Signalement'}</span>
                  <UrgenceBadge urgence={s.urgence} compact />
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>

      <Confirmation
        ouvert={Boolean(aAnnuler)}
        onFermer={() => setAAnnuler(null)}
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

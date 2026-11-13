// Agent municipal : ce qui attend une décision, les zones en retard de collecte, la carte de la ville, les tournées du jour
import { Link } from 'react-router-dom'
import { AlertTriangle, CalendarClock, ClipboardCheck, Route, Truck } from 'lucide-react'
import { carteSignalements, listerCollectes, listerSignalements, listerZones, statsZones, tableauDeBord } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { Carte, LegendeUrgences, MarqueurSignalement, Zones } from '../../components/map/Carte'
import { StatutBadge, UrgenceBadge } from '../../components/common/Badge'
import { Chiffre, EnTete, Erreur } from '../../components/common/ui'
import { ilYa, jourHeure, km, pluriel } from '../../utils/format'
import { T } from '../../context/LangueContext'

export default function AgentDashboard() {
  const { user } = useAuth()
  const stats = useDonnees(tableauDeBord, [], { intervalle: 60000 })
  const carte = useDonnees(() => carteSignalements(), [], { intervalle: 60000 })
  const zones = useDonnees(listerZones, [])
  const urgents = useDonnees(() => listerSignalements({ statut: 'en_attente', limit: 5 }), [], { intervalle: 60000 })
  const tournees = useDonnees(() => listerCollectes({ statut: 'planifiee', limit: 4 }), [])
  const suivi = useDonnees(statsZones, [], { intervalle: 300000 })
  const enRetard = suivi.donnees?.filter((z) => z.en_retard) ?? []
  const s = stats.donnees

  return (
    <div className="space-y-6">
      <EnTete
        titre={`Bonjour ${user.prenom}`}
        texte="Les signalements à vérifier et les tournées à venir."
        actions={
          <Link to="/agent/planifier" className="btn-principal">
            <Route className="h-4 w-4" /> <T>Planifier une tournée</T>
          </Link>
        }
      />
      {stats.erreur && <Erreur message={stats.erreur} onReessayer={stats.recharger} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Chiffre icone={ClipboardCheck} ton="ambre" valeur={s?.en_attente ?? '—'} libelle="À valider" detail="Signalements en attente" />
        <Chiffre icone={AlertTriangle} ton="alerte" valeur={s?.critiques_ouverts ?? '—'} libelle="Urgences critiques" detail="Non encore ramassées" />
        <Chiffre icone={Route} ton="vert" valeur={s?.valides ?? '—'} libelle="Prêts à planifier" detail="Validés, sans tournée" />
        <Chiffre icone={Truck} ton="bleu" valeur={s ? `${s.camions_disponibles}/${s.camions}` : '—'} libelle="Camions disponibles" />
      </div>

      {enRetard.length > 0 && (
        <section className="carte border-ambre/40 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarClock className="h-5 w-5 text-ambre" /> Zones à desservir
          </h2>
          <p className="text-sm text-encre-doux">Des dépôts validés y attendent et le camion n’est pas passé depuis plus longtemps que la fréquence prévue.</p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {enRetard.map((z) => (
              <li key={z.id} className="flex items-center justify-between gap-3 rounded-xl bg-ambre-50/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ardoise">{z.nom}</p>
                  <p className="text-xs text-encre-doux">
                    {pluriel(z.a_planifier, 'dépôt validé', 'dépôts validés')} ·{' '}
                    {z.jours_depuis_collecte === null ? 'jamais desservie' : `dernier passage il y a ${pluriel(z.jours_depuis_collecte, 'jour')}`} (prévu tous les {z.frequence_collecte_jours} j)
                  </p>
                </div>
                <Link to="/agent/planifier" state={{ zoneId: z.id }} className="btn-secondaire min-h-[36px] shrink-0 px-3">
                  <T>Planifier</T>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section>
          <Carte className="h-[460px]" zoom={14}>
            <Zones zones={zones.donnees} />
            {carte.donnees?.map((p) => (
              <MarqueurSignalement key={p.id} signalement={p} estompe={p.statut === 'collecte'}>
                <div className="w-52 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    <StatutBadge statut={p.statut} />
                    <UrgenceBadge urgence={p.urgence} compact />
                  </div>
                  <p>{p.description}</p>
                  <p className="text-xs text-encre-pale">
                    {p.zone_nom ?? 'Hors zone'} · {p.citoyen_nom} · {ilYa(p.created_at)}
                  </p>
                </div>
              </MarqueurSignalement>
            ))}
          </Carte>
          <LegendeUrgences className="mt-3" />
        </section>

        <aside className="space-y-6">
          <div className="carte p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold"><T>À vérifier en priorité</T></h2>
              <Link to="/agent/signalements" className="text-sm font-semibold text-marque hover:underline">
                <T>Tout voir</T>
              </Link>
            </div>
            {urgents.donnees?.signalements.length === 0 && <p className="mt-3 text-sm text-encre-doux">Rien en attente. Tous les signalements ont été traités.</p>}
            <ul className="mt-2 divide-y divide-trait">
              {urgents.donnees?.signalements.map((x) => (
                <li key={x.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <UrgenceBadge urgence={x.urgence} compact />
                    <span className="text-xs text-encre-pale">{ilYa(x.created_at)}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium">{x.description ?? 'Sans description'}</p>
                  <p className="text-xs text-encre-pale">{x.zone_nom ?? 'Hors zone'}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="carte p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold"><T>Tournées planifiées</T></h2>
              <Link to="/agent/collectes" className="text-sm font-semibold text-marque hover:underline">
                <T>Toutes</T>
              </Link>
            </div>
            {tournees.donnees?.collectes.length === 0 && <p className="mt-3 text-sm text-encre-doux">Aucune tournée à venir.</p>}
            <ul className="mt-2 divide-y divide-trait">
              {tournees.donnees?.collectes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{jourHeure(c.date_planifiee)}</p>
                    <p className="text-xs text-encre-pale">
                      {c.camion_immatriculation} · {c.nb_points} arrêts · {km(c.distance_km)}
                    </p>
                  </div>
                  <StatutBadge statut={c.statut} type="collecte" />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}

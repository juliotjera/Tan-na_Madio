// Tableau de bord administrateur : actions rapides, priorités (ce qui demande une action maintenant),
// 5 indicateurs, signalements par statut, performance mensuelle, derniers signalements et collectes
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, ImageOff, RefreshCw, Siren, TriangleAlert, Truck, Users } from 'lucide-react'
import { listerCollectes, listerSignalements, statsPeriode, statsZones, tableauDeBord } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { CourbePerformance } from '../../components/common/Graphiques'
import { StatutBadge } from '../../components/common/Badge'
import { Chargement, Chiffre, Erreur } from '../../components/common/ui'
import { dateCourte, nombre } from '../../utils/format'
import { T } from '../../context/LangueContext'

const fmt = (v) => (v == null ? '—' : v.toLocaleString('fr-FR'))

function Barre({ libelle, valeur, total, couleur }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-encre">{libelle}</span>
        <span className="font-semibold">{valeur}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fond">
        <div className={`h-full rounded-full ${couleur}`} style={{ width: `${total ? Math.max(2, (valeur / total) * 100) : 0}%` }} />
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const stats = useDonnees(tableauDeBord, [], { intervalle: 60000 })
  const periode = useDonnees(() => statsPeriode(), [])
  const signalements = useDonnees(() => listerSignalements({ limit: 5 }), [])
  const collectes = useDonnees(() => listerCollectes({ limit: 5 }), [])
  const zones = useDonnees(statsZones, [])
  const zonesEnRetard = zones.donnees?.filter((z) => z.en_retard).length
  const s = stats.donnees

  const toutRecharger = () => {
    stats.recharger()
    periode.recharger()
    signalements.recharger()
    collectes.recharger()
    zones.recharger()
  }
  const serie = s?.serie_14_jours?.map((p) => p.n)
  const totalStatuts = s ? s.en_attente + s.en_cours + s.collectes_signalements : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px]">Tableau de bord administrateur</h1>
        <p className="mt-1 text-encre-doux"><T>Vue d’ensemble de la plateforme Tanàna Madio</T></p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* Actions rapides */}
        <section className="carte p-6">
          <h2 className="text-lg"><T>Actions rapides</T></h2>
          <p className="text-sm text-encre-doux">Les écrans les plus utilisés, à portée d’un clic</p>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-trait pt-5 sm:grid-cols-4">
            <Link to="/agent/signalements" className="flex flex-col items-center gap-2 rounded-xl border border-trait px-2 py-4 text-sm font-medium transition hover:border-vert-300 hover:bg-vert-50">
              <TriangleAlert className="h-5 w-5 text-vert-500" /> Signalements
            </Link>
            <Link to="/agent/collectes" className="flex flex-col items-center gap-2 rounded-xl border border-trait px-2 py-4 text-sm font-medium transition hover:border-vert-300 hover:bg-vert-50">
              <ClipboardList className="h-5 w-5 text-vert-500" /> Collectes
            </Link>
            <Link to="/admin/utilisateurs" className="flex flex-col items-center gap-2 rounded-xl border border-trait px-2 py-4 text-sm font-medium transition hover:border-vert-300 hover:bg-vert-50">
              <Users className="h-5 w-5 text-vert-500" /> Utilisateurs
            </Link>
            <button type="button" onClick={toutRecharger} className="flex flex-col items-center gap-2 rounded-xl border border-trait px-2 py-4 text-center text-sm font-medium transition hover:border-vert-300 hover:bg-vert-50">
              <RefreshCw className="h-5 w-5 text-vert-500" /> Actualiser toutes les données
            </button>
          </div>
        </section>

        {/* Priorités : ce qui attend une décision maintenant, chaque ligne mène à l'écran où agir */}
        <section className="relative overflow-hidden rounded-carte bg-sombre bg-[radial-gradient(90%_120%_at_100%_0%,rgba(0,128,67,0.45),transparent_60%)] p-6 text-white shadow-flotte ring-1 ring-or/20">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div>
              <h2 className="text-[26px] leading-tight text-white"><T>Priorités du moment</T></h2>
              <p className="mt-2 max-w-xs text-sm text-white/70">Ce qui attend une décision de la commune, du plus urgent au plus courant.</p>
              <span className="mt-5 block h-px w-16 bg-or/70" aria-hidden />
            </div>
            <ul className="space-y-2">
              {[
                { icone: Siren, libelle: 'Urgences critiques ouvertes', valeur: s?.critiques_ouverts, vers: '/agent/signalements' },
                { icone: ClipboardCheck, libelle: 'Signalements à valider', valeur: s?.en_attente, vers: '/agent/signalements' },
                { icone: CalendarClock, libelle: 'Zones à desservir', valeur: zonesEnRetard, vers: '/agent' },
                { icone: Truck, libelle: 'Camions disponibles', valeur: s ? `${s.camions_disponibles}/${s.camions}` : null, vers: '/agent/planifier' },
              ].map(({ icone: Icone, libelle, valeur, vers }) => (
                <li key={libelle}>
                  <Link to={vers} className="group flex items-center gap-3 rounded-xl bg-white/[0.06] px-3.5 py-2.5 ring-1 ring-white/10 transition duration-200 hover:bg-white/[0.1] hover:ring-or/40">
                    <Icone className="h-4 w-4 shrink-0 text-or" />
                    <span className="flex-1 text-sm text-white/85">{libelle}</span>
                    <span className="chiffre text-lg text-or-clair">{valeur ?? '—'}</span>
                    <ChevronRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-or" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {stats.erreur && <Erreur message={stats.erreur} onReessayer={stats.recharger} />}
      {!s && stats.chargement && <Chargement />}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Chiffre ton="vert" icone={TriangleAlert} libelle="Signalements" valeur={nombre(s.signalements)} tendance={s.evolution_signalements_pct} serie={serie} />
          <Chiffre ton="vert" icone={Users} libelle="Utilisateurs" valeur={nombre(s.utilisateurs)} detail={`${s.camions} camions dans la flotte`} />
          <Chiffre ton="ambre" icone={Truck} libelle="Collectes" valeur={nombre(s.collectes)} detail={`${s.collectes_terminees} terminées`} />
          <Chiffre ton="bleu" icone={CheckCircle2} libelle="Taux de réussite" valeur={`${fmt(s.taux_reussite)} %`} detail="Signalements retenus déjà collectés" />
          <Chiffre ton="violet" icone={CalendarDays} libelle="Traitement moyen" valeur={s.delai_moyen_heures != null ? `${fmt(s.delai_moyen_heures)} h` : '—'} detail="Délai de validation" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="carte p-6">
          <h2 className="text-xl"><T>Signalements par statut</T></h2>
          {s && (
            <div className="mt-5 space-y-5">
              <Barre libelle="En attente" valeur={s.en_attente} total={totalStatuts} couleur="bg-ambre" />
              <Barre libelle="En cours" valeur={s.en_cours} total={totalStatuts} couleur="bg-blue-500" />
              <Barre libelle="Collectés" valeur={s.collectes_signalements} total={totalStatuts} couleur="bg-vert-500" />
            </div>
          )}
        </section>
        <section className="carte p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-xl"><T>Performance mensuelle</T></h2>
              <p className="text-sm text-encre-doux">30 derniers jours</p>
            </div>
            <p className="flex gap-4 text-xs text-encre-doux">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-or" /> <T>Reçus</T>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-vert" /> <T>Ramassés</T>
              </span>
            </p>
          </div>
          {periode.donnees ? <CourbePerformance series={periode.donnees.series} /> : <Chargement lignes={1} />}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="carte p-6">
          <h2 className="text-xl"><T>Derniers signalements</T></h2>
          <ul className="mt-4 divide-y divide-trait">
            {signalements.donnees?.signalements.map((x) => (
              <li key={x.id} className="flex items-center gap-3 py-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-fond">
                  {x.photo_url ? (
                    <img src={x.photo_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-encre-pale">
                      <ImageOff className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{x.description ?? 'Sans description'}</span>
                  <span className="block text-xs text-encre-pale">{x.zone_nom ?? 'Hors zone'}</span>
                </span>
                <StatutBadge statut={x.statut} />
              </li>
            ))}
          </ul>
        </section>
        <section className="carte p-6">
          <h2 className="text-xl"><T>Dernières collectes</T></h2>
          <ul className="mt-4 divide-y divide-trait">
            {collectes.donnees?.collectes.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block text-sm font-medium">Collecte du {dateCourte(c.date_planifiee)}</span>
                  <span className="block text-xs text-encre-pale">
                    {c.nb_points} signalement{c.nb_points > 1 ? 's' : ''} · {c.camion_immatriculation}
                  </span>
                </span>
                <StatutBadge statut={c.statut} type="collecte" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

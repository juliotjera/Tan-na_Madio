// Tableau de bord administrateur (version d'origine) : actions rapides, priorité du mois,
// 5 indicateurs, signalements par statut, performance mensuelle, derniers signalements et collectes
import { Link } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ClipboardList, ImageOff, RefreshCw, TriangleAlert, Truck, Users } from 'lucide-react'
import { listerCollectes, listerSignalements, statsPeriode, tableauDeBord } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { CourbePerformance } from '../../components/common/Graphiques'
import { StatutBadge } from '../../components/common/Badge'
import { Chargement, Chiffre, Erreur } from '../../components/common/ui'
import { dateCourte, nombre } from '../../utils/format'

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
  const s = stats.donnees

  const toutRecharger = () => {
    stats.recharger()
    periode.recharger()
    signalements.recharger()
    collectes.recharger()
  }
  const serie = s?.serie_14_jours?.map((p) => p.n)
  const totalStatuts = s ? s.en_attente + s.en_cours + s.collectes_signalements : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px]">Tableau de bord administrateur</h1>
        <p className="mt-1 text-encre-doux">Vue d’ensemble de la plateforme Tanàna Madio</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* Actions rapides */}
        <section className="carte p-6">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-encre-pale">Actions rapides</p>
          <p className="mt-2 font-titre text-lg font-bold">Lancez une action en un clic</p>
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

        {/* Priorité du mois */}
        <section className="rounded-carte bg-gradient-to-br from-vert-500 to-[#34D399] p-6 text-white shadow-sm">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/80">Insights prioritaires</p>
              <p className="mt-2 font-titre text-[28px] font-bold leading-tight">Priorité du mois</p>
              <p className="mt-2 max-w-xs text-sm text-white/90">
                Gardez un œil sur les délais de traitement et la progression des signalements pour piloter l’action communale efficacement.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Signalements', fmt(s?.signalements)],
                ['Collectes', fmt(s?.collectes)],
                ['Taux de réussite', s ? `${fmt(s.taux_reussite)} %` : '—'],
                ['Traitement moyen', s?.delai_moyen_heures != null ? `${fmt(s.delai_moyen_heures)} h` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/15 px-4 py-3">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-white/80">{k}</dt>
                  <dd className="chiffre mt-1 text-2xl">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>

      {stats.erreur && <Erreur message={stats.erreur} onReessayer={stats.recharger} />}
      {!s && stats.chargement && <Chargement />}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Chiffre ton="vert" icone={TriangleAlert} libelle="Signalements" valeur={nombre(s.signalements)} tendance={s.evolution_signalements_pct} serie={serie} />
          <Chiffre ton="vert" icone={Users} libelle="Utilisateurs" valeur={nombre(s.utilisateurs)} detail={`${s.camions} camions dans la flotte`} />
          <Chiffre ton="ambre" icone={Truck} libelle="Collectes" valeur={nombre(s.collectes)} detail={`${s.collectes_terminees} terminées`} />
          <Chiffre ton="bleu" icone={CheckCircle2} libelle="Taux de réussite" valeur={`${fmt(s.taux_reussite)} %`} detail="Signalements retenus déjà collectés" />
          <Chiffre ton="violet" icone={CalendarDays} libelle="Traitement moyen" valeur={s.delai_moyen_heures != null ? `${fmt(s.delai_moyen_heures)} h` : '—'} detail="Délai de validation" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="carte p-6">
          <h2 className="text-xl">Signalements par statut</h2>
          {s && (
            <div className="mt-5 space-y-5">
              <Barre libelle="En attente" valeur={s.en_attente} total={totalStatuts} couleur="bg-ambre" />
              <Barre libelle="En cours" valeur={s.en_cours} total={totalStatuts} couleur="bg-blue-500" />
              <Barre libelle="Collectés" valeur={s.collectes_signalements} total={totalStatuts} couleur="bg-vert-500" />
            </div>
          )}
        </section>
        <section className="carte p-6">
          <h2 className="text-xl">Performance mensuelle</h2>
          <p className="text-sm text-encre-doux">Signalements reçus sur les 30 derniers jours</p>
          {periode.donnees ? <CourbePerformance series={periode.donnees.series} /> : <Chargement lignes={1} />}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="carte p-6">
          <h2 className="text-xl">Derniers signalements</h2>
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
          <h2 className="text-xl">Dernières collectes</h2>
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

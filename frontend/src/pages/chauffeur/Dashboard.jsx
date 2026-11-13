// Tableau de bord du chauffeur (version d'origine) : bandeau d'accueil, 4 compteurs,
// tournée du jour, dernières tournées effectuées
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, CheckCircle2, MapPin, Route, Truck } from 'lucide-react'
import { isSameDay, isSameMonth } from 'date-fns'
import { listerCollectes, profil } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { useLangue } from '../../context/LangueContext'
import { Chargement, Erreur } from '../../components/common/ui'
import { dateCourte, jourHeure, km } from '../../utils/format'
import InterrupteurPush from '../../components/common/InterrupteurPush'

function Stat({ icone: Icone, valeur, libelle }) {
  return (
    <div className="carte flex flex-col items-center px-4 py-6 text-center">
      <Icone className="h-6 w-6 text-or" />
      <p className="chiffre mt-3 text-[28px] leading-none text-ardoise">{valeur}</p>
      <p className="mt-2 text-sm text-encre-doux">{libelle}</p>
    </div>
  )
}

export default function ChauffeurDashboard() {
  const { user } = useAuth()
  const { t } = useLangue()
  const moi = useDonnees(profil, [])
  const liste = useDonnees(() => listerCollectes({ limit: 100 }), [], { intervalle: 30000 })
  const collectes = liste.donnees?.collectes ?? []
  const maintenant = new Date()

  const planifiees = collectes.filter((c) => c.statut === 'planifiee')
  const enCours = collectes.filter((c) => c.statut === 'en_cours')
  const termineesMois = collectes.filter((c) => c.statut === 'terminee' && c.date_fin && isSameMonth(new Date(c.date_fin), maintenant))
  const kmAujourdhui = collectes
    .filter((c) => c.statut === 'terminee' && c.date_fin && isSameDay(new Date(c.date_fin), maintenant))
    .reduce((s, c) => s + (c.distance_km ?? 0), 0)
  // tournée du jour : celle en cours, sinon la prochaine planifiée
  const duJour = enCours[0] ?? [...planifiees].sort((a, b) => new Date(a.date_planifiee) - new Date(b.date_planifiee))[0] ?? null
  const dernieres = collectes.filter((c) => c.statut === 'terminee').slice(0, 5)

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-carte bg-sombre bg-[radial-gradient(90%_140%_at_100%_0%,rgba(201,165,92,0.22),transparent_60%)] p-6 text-white shadow-flotte ring-1 ring-or/20 sm:p-7">
        <p className="text-sm text-or">{t('Chauffeur')}</p>
        <h1 className="mt-1 text-[28px] text-white">
          {t('Bonjour')} {user.prenom}
        </h1>
        {moi.donnees?.camion_immatriculation && (
          <p className="mt-1 text-sm text-white/85">
            {t('Votre camion')} : <span className="font-semibold text-or-clair">{moi.donnees.camion_immatriculation}</span>
          </p>
        )}
      </section>

      <InterrupteurPush compact />

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icone={CalendarDays} valeur={planifiees.length} libelle={t('Tournée planifiée')} />
        <Stat icone={Route} valeur={enCours.length} libelle={t('En cours')} />
        <Stat icone={CheckCircle2} valeur={termineesMois.length} libelle={t('Terminées ce mois')} />
        <Stat icone={MapPin} valeur={km(kmAujourdhui)} libelle={t('Distance aujourd’hui')} />
      </div>

      {liste.donnees &&
        (duJour ? (
          <section className="carte p-6">
            <h2 className="flex items-center gap-2 text-xl">
              <Truck className="h-5 w-5 text-or" /> {t('Tournée du jour')}
            </h2>
            <p className="mt-2 text-encre-doux">{jourHeure(duJour.date_planifiee)}</p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-encre-pale">{t('Zone')}</dt>
                <dd className="font-semibold">{duJour.zone_nom ?? t('Plusieurs zones')}</dd>
              </div>
              <div>
                <dt className="text-xs text-encre-pale">{t('Camion')}</dt>
                <dd className="font-semibold">{duJour.camion_immatriculation}</dd>
              </div>
              <div>
                <dt className="text-xs text-encre-pale">{t('Points')}</dt>
                <dd className="font-semibold">
                  {duJour.nb_faits}/{duJour.nb_points}
                </dd>
              </div>
            </dl>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium">
              <span className={`h-2.5 w-2.5 rounded-full ${duJour.statut === 'en_cours' ? 'bg-ambre' : 'bg-or'}`} />
              {duJour.statut === 'en_cours' ? t('En cours') : t('Planifiée')} · {km(duJour.distance_km)}
            </p>
            <Link to={`/chauffeur/tournees/${duJour.id}`} className="btn-principal mt-5 w-full min-h-[48px] text-base">
              {duJour.statut === 'en_cours' ? t('Continuer la tournée') : t('Voir l’itinéraire')} <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <section className="carte px-6 py-10 text-center text-encre-doux">{t('Aucune tournée prévue pour aujourd’hui')}</section>
        ))}

      <section className="carte p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <CheckCircle2 className="h-5 w-5 text-or" /> {t('Dernières tournées effectuées')}
        </h2>
        {liste.donnees && dernieres.length === 0 && <p className="mt-3 text-sm text-encre-doux">{t('Aucune tournée terminée pour l’instant.')}</p>}
        <ul className="mt-4 space-y-2">
          {dernieres.map((c) => (
            <li key={c.id}>
              <Link to={`/chauffeur/tournees/${c.id}`} className="flex items-center gap-3 rounded-xl bg-or-50 px-4 py-3 transition hover:bg-or-100">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-or" />
                <span>
                  <span className="block font-semibold">
                    {dateCourte(c.date_fin ?? c.date_planifiee)} — {c.zone_nom ?? t('Plusieurs zones')}
                  </span>
                  <span className="block text-sm text-encre-doux">
                    {c.nb_faits}/{c.nb_points} • {km(c.distance_km)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

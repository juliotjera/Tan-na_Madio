// Accueil public : la ville en direct et la promesse du service (signaler → ramasser au plus court)
import { Link, Navigate } from 'react-router-dom'
import { Camera, CheckCircle2, Route as IconeRoute, Truck } from 'lucide-react'
import { apercuPublic } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useDonnees } from '../hooks/useDonnees'
import { ACCUEIL_PAR_ROLE } from '../context/AuthContext'
import { Cadrer, Carte, Itineraire, LegendeUrgences, MarqueurSignalement } from '../components/map/Carte'
import { Logo } from '../components/layout/Logo'
import { kg, nombre } from '../utils/format'

const ETAPES = [
  { icone: Camera, titre: 'Vous signalez', texte: 'Une photo, votre position GPS, le niveau d’urgence. Trente secondes depuis votre téléphone.' },
  { icone: CheckCircle2, titre: 'La commune vérifie', texte: 'Un agent municipal valide le signalement et le classe par zone et par priorité.' },
  { icone: IconeRoute, titre: 'La tournée est calculée', texte: 'L’algorithme de Dijkstra mesure les distances par les rues, puis ordonne les arrêts au plus court.' },
  { icone: Truck, titre: 'Le camion ramasse', texte: 'Le chauffeur suit l’itinéraire et coche chaque point. Vous êtes prévenu, et vous gagnez des points éco.' },
]

export default function LandingPage() {
  const { connecte, user } = useAuth()
  const { donnees } = useDonnees(apercuPublic, [])
  if (connecte) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const tournee = donnees?.tournee
  const points = donnees?.points ?? []
  const cadre = tournee?.trace?.length ? tournee.trace : points.map((p) => [p.latitude, p.longitude])

  return (
    <div className="min-h-screen bg-papier">
      <header className="mx-auto flex max-w-[1240px] items-center justify-between px-4 pb-4 pt-[max(20px,env(safe-area-inset-top))] sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link to="/login" className="btn-discret">
            Se connecter
          </Link>
          <Link to="/register" className="btn-principal hidden sm:inline-flex">
            Créer un compte
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-[1240px] items-center gap-10 px-4 pb-16 pt-6 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:pt-12">
        <div>
          <h1 className="max-w-xl text-[40px] font-bold leading-[1.04] sm:text-[56px]">Un dépôt d’ordures signalé, ramassé par le chemin le plus court.</h1>
          <p className="mt-5 max-w-lg text-lg text-encre-doux">
            Tanàna Madio relie les habitants d’Antananarivo aux équipes de collecte de la commune. Vous montrez où sont les déchets, la commune
            planifie des tournées plus courtes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-principal min-h-[50px] px-6 text-base">
              <Camera className="h-5 w-5" />
              Signaler un dépôt
            </Link>
            <Link to="/login" className="btn-secondaire min-h-[50px] px-6 text-base">
              Espace agents et chauffeurs
            </Link>
          </div>
          {donnees && (
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-trait pt-6">
              <div>
                <dt className="text-sm text-encre-doux">Signalements</dt>
                <dd className="chiffre mt-1 text-3xl text-nuit">{nombre(donnees.signalements)}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux">Dépôts ramassés</dt>
                <dd className="chiffre mt-1 text-3xl text-nuit">{nombre(donnees.collectes)}</dd>
              </div>
              <div>
                <dt className="text-sm text-encre-doux">Déchets collectés</dt>
                <dd className="chiffre mt-1 text-3xl text-nuit">{kg(donnees.poids_total_kg)}</dd>
              </div>
            </dl>
          )}
        </div>

        {/* La pièce maîtresse : une vraie tournée optimisée, tracée sur la ville */}
        <div>
          <div className="relative">
          <Carte className="h-[440px] shadow-flotte sm:h-[540px]" zoom={14} defilement={false} zoomControl={false} attributionControl>
            {points.map((p, i) => (
              <MarqueurSignalement key={i} signalement={p} estompe={p.statut === 'collecte'} />
            ))}
            {tournee && <Itineraire trace={tournee.trace} traceNaive={tournee.trace_naive} />}
            {cadre.length > 0 && <Cadrer points={cadre} marge={60} max={15} />}
          </Carte>
          {tournee && (
            <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl bg-nuit p-4 text-white shadow-flotte sm:left-auto sm:right-5 sm:w-[300px] sm:p-5">
              <p className="chiffre text-[40px] leading-none text-ciel">−{Math.round(tournee.gain_pourcent)} %</p>
              <p className="mt-2 text-sm text-bleu-100/85">
                de route sur cette tournée : {tournee.distance_km.toLocaleString('fr-FR')} km au lieu de {tournee.distance_naive_km.toLocaleString('fr-FR')} km
                dans l’ordre des signalements.
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-bleu-100/70">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1 w-5 rounded bg-ciel" /> optimisée
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-5 border-t-2 border-dotted border-bleu-100/60" /> ordre d’arrivée
                </span>
              </div>
            </div>
          )}
          </div>
          <LegendeUrgences className="mt-3 justify-end" />
        </div>
      </section>

      <section className="border-y border-trait bg-white">
        <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-8">
          <h2 className="max-w-xl text-[30px] font-semibold leading-tight sm:text-[36px]">Du signalement au camion, en quatre étapes</h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ETAPES.map((e, i) => {
              const Icone = e.icone
              return (
                <li key={e.titre} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-bleu-100 text-bleu">
                      <Icone className="h-5 w-5" />
                    </span>
                    <span className="font-titre text-sm font-semibold text-encre-pale">Étape {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{e.titre}</h3>
                  <p className="mt-1.5 text-[15px] text-encre-doux">{e.texte}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 className="text-[30px] font-semibold leading-tight sm:text-[36px]">Chaque signalement compte, et se voit</h2>
          <p className="mt-4 max-w-xl text-lg text-encre-doux">
            Vous suivez votre signalement jusqu’au ramassage. À chaque étape, vous gagnez des points éco : 2 à l’envoi, 5 à la validation, 10 quand le
            camion est passé.
          </p>
        </div>
        <div className="carte flex flex-col gap-3 p-6">
          {[
            ['Envoyé', '+2 points', 'bg-ambre-100 text-ambre-700'],
            ['Validé par la commune', '+5 points', 'bg-bleu-100 text-bleu'],
            ['Ramassé', '+10 points', 'bg-bleu text-white'],
          ].map(([etape, points, couleur]) => (
            <div key={etape} className="flex items-center justify-between gap-4 rounded-xl border border-trait px-4 py-3">
              <span className="font-medium">{etape}</span>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${couleur}`}>{points}</span>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-nuit">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-4 py-10 text-sm text-bleu-100/70 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo clair />
          <p>Commune urbaine d’Antananarivo · Projet de fin d’études, ESMIA Innovation</p>
        </div>
      </footer>
    </div>
  )
}

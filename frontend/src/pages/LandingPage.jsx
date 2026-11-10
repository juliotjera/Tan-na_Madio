// Accueil public (version d'origine) : carte sombre animée d'Antananarivo, rôles, inscription
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BarChart3, Building2, Home, Lock, Mail, MapPin, Rocket, Settings, Sprout, Truck } from 'lucide-react'
import { apercuPublic } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useDonnees } from '../hooks/useDonnees'
import { useLangue } from '../context/LangueContext'
import { ACCUEIL_PAR_ROLE } from '../context/AuthContext'
import { Carte, MarqueurSignalement } from '../components/map/Carte'
import { Logo } from '../components/layout/Logo'
import { nombre } from '../utils/format'

const PILIERS = [
  { icone: MapPin, couleur: 'text-blue-500', titre: 'Signalez', texte: 'un déchet en 1 clic' },
  { icone: Truck, couleur: 'text-vert-500', titre: 'Optimisez', texte: 'les tournées avec Dijkstra' },
  { icone: BarChart3, couleur: 'text-violet-500', titre: 'Analysez', texte: 'les données en temps réel' },
]
const ROLES_ACCUEIL = [
  { icone: Home, titre: 'Citoyen', texte: 'Signalez les déchets dans votre quartier' },
  { icone: Building2, titre: 'Agent', texte: 'Gérez les signalements et tournées' },
  { icone: Truck, titre: 'Chauffeur', texte: 'Consultez vos tournées de collecte' },
  { icone: Settings, titre: 'Admin', texte: 'Administrez le système complet' },
]

// Les marqueurs apparaissent un à un sur la carte sombre (le système « en direct »)
function useApparitionProgressive(total, pas = 180) {
  const [visibles, setVisibles] = useState(0)
  useEffect(() => {
    if (!total) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibles(total)
      return undefined
    }
    setVisibles(0)
    const id = setInterval(() => setVisibles((v) => (v >= total ? v : v + 1)), pas)
    return () => clearInterval(id)
  }, [total, pas])
  return visibles
}

export default function LandingPage() {
  const { connecte, user } = useAuth()
  const { langue, setLangue, t } = useLangue()
  const { donnees } = useDonnees(apercuPublic, [])
  const points = donnees?.points ?? []
  const visibles = useApparitionProgressive(points.length)
  if (connecte) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const chiffres = [
    { valeur: donnees ? nombre(donnees.collectes) : '—', libelle: 'Signalements résolus', couleur: 'text-vert-500' },
    { valeur: donnees ? nombre(donnees.citoyens) : '—', libelle: 'Utilisateurs actifs', couleur: 'text-blue-400' },
    { valeur: donnees ? nombre(donnees.zones) : '—', libelle: 'Zones couvertes', couleur: 'text-violet-400' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <header className="sticky top-0 z-[1100] border-b border-trait bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1180px] items-center justify-between px-4 sm:px-6">
          <Logo sousTitre />
          <nav className="flex items-center gap-2 sm:gap-4">
            <select
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              aria-label={t('Langue')}
              className="hidden rounded-full border border-trait bg-white py-1.5 pl-3 pr-8 text-xs font-medium sm:block"
            >
              <option value="fr">Français</option>
              <option value="mg">Malagasy</option>
            </select>
            <Link to="/login" className="px-2 text-[15px] font-semibold text-ardoise hover:text-vert">
              {t('Se connecter')}
            </Link>
            <Link to="/register" className="btn-principal px-5">
              {t("S'inscrire")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Héros sur la carte sombre animée */}
      <section className="relative isolate overflow-hidden bg-sombre">
        <div className="absolute inset-0 -z-10 opacity-70" aria-hidden>
          <Carte
            className="carte-sombre h-full rounded-none border-0"
            zoom={13}
            defilement={false}
            zoomControl={false}
            dragging={false}
            doubleClickZoom={false}
            attributionControl={false}
            keyboard={false}
          >
            {points.slice(0, visibles).map((p, i) => (
              <MarqueurSignalement key={i} signalement={p} />
            ))}
          </Carte>
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sombre via-sombre/85 to-sombre/30" aria-hidden />

        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-vert-100 px-4 py-1.5 text-sm font-semibold text-vert-700">
              <Sprout className="h-4 w-4" /> {t('Bienvenue à Tanàna Madio')}
            </span>
            <h1 className="mt-6 max-w-xl text-[44px] font-extrabold leading-[1.05] text-white sm:text-[60px]">{t('La ville propre de demain')}</h1>
            <p className="mt-6 text-lg text-white/85">
              {t('Système intelligent de gestion des déchets urbains')} • <span className="font-semibold text-white">Madagascar 2035</span>
            </p>
            <p className="mt-5 max-w-lg text-white/70">
              {t('Rejoignez-nous pour créer une Antananarivo plus propre et durable. Ensemble, nous changeons la ville, un déchet à la fois.')}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/register" className="btn-principal min-h-[54px] px-7 text-base">
                <Rocket className="h-5 w-5" /> {t('Commencer maintenant')}
              </Link>
              <a href="#pourquoi" className="btn min-h-[54px] border-2 border-white bg-white px-7 text-base text-vert hover:bg-vert-50">
                {t('En savoir plus')}
              </a>
            </div>
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {chiffres.map((c) => (
                <div key={c.libelle} className="flex flex-col-reverse">
                  <dt className="text-sm text-white/55">{t(c.libelle)}</dt>
                  <dd className={`chiffre text-3xl ${c.couleur}`}>{c.valeur}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Carte « Antananarivo » avec badges flottants */}
          <div className="relative mx-auto hidden w-full max-w-[300px] sm:block">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-8 backdrop-blur-sm">
              <div className="mx-auto flex aspect-square w-full flex-col items-center justify-center rounded-full bg-white shadow-flotte">
                <MapPin className="h-14 w-14 text-vert-500" strokeWidth={1.75} />
                <p className="mt-3 font-titre text-lg font-semibold text-ardoise">Antananarivo</p>
                <p className="text-sm text-encre-doux">Madagascar</p>
                <div className="mt-4 flex flex-col items-center gap-1.5" aria-hidden>
                  <span className="h-2 w-2 animate-clignoter rounded-full bg-vert-500" />
                  <span className="h-2 w-2 animate-clignoter rounded-full bg-vert-500 [animation-delay:0.3s]" />
                  <span className="h-2 w-2 animate-clignoter rounded-full bg-vert-500 [animation-delay:0.6s]" />
                </div>
              </div>
            </div>
            <span className="absolute -right-3 top-6 flex animate-flotter items-center gap-1.5 rounded-full bg-vert-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              <span className="h-2 w-2 animate-clignoter rounded-full bg-white" /> {t('En direct')}
            </span>
            <span className="absolute -left-3 bottom-10 animate-flotter-lent rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg">
              {donnees ? `${donnees.zones} ${t('zones')}` : t('zones')}
            </span>
          </div>
        </div>
      </section>

      {/* Les trois piliers */}
      <section id="pourquoi" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-[1180px] px-4 text-center sm:px-6">
          <h2 className="text-[32px] font-bold sm:text-[38px]">{t('Pourquoi Tanàna Madio ?')}</h2>
          <p className="mt-3 text-lg text-encre-doux">{t('Les trois piliers de notre système intelligent')}</p>
          <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
            {PILIERS.map((p) => {
              const Icone = p.icone
              return (
                <div key={p.titre} className="rounded-carte border border-trait/70 bg-gradient-to-br from-white to-fond/60 p-8 shadow-carte">
                  <Icone className={`h-11 w-11 ${p.couleur}`} strokeWidth={1.75} />
                  <h3 className="mt-6 text-2xl font-bold">{t(p.titre)}</h3>
                  <p className="mt-1 text-lg text-encre-doux">{t(p.texte)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Rôles */}
      <section className="bg-fond/50 py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-[32px] font-bold sm:text-[38px]">{t('Vous êtes ?')}</h2>
            <p className="mt-3 text-lg text-encre-doux">{t('Choisissez votre rôle pour accéder à votre espace')}</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES_ACCUEIL.map((r) => {
              const Icone = r.icone
              return (
                <Link
                  key={r.titre}
                  to={r.titre === 'Citoyen' ? '/register' : '/login'}
                  className="rounded-carte border border-trait/70 bg-white p-8 text-center shadow-carte transition hover:-translate-y-0.5 hover:border-vert-300"
                >
                  <Icone className="mx-auto h-14 w-14 text-vert-500" strokeWidth={1.6} />
                  <h3 className="mt-5 text-2xl font-bold">{t(r.titre)}</h3>
                  <p className="mt-2 text-encre-doux">{t(r.texte)}</p>
                </Link>
              )
            })}
          </div>

          <div className="mx-auto mt-14 max-w-[1050px] rounded-carte border border-vert-300/70 bg-gradient-to-r from-vert-50 to-blue-50/60 p-10 text-center">
            <p className="text-lg text-encre-doux">{t('Premiers pas avec Tanàna Madio ?')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-principal min-h-[60px] flex-col gap-0.5 px-8 text-base shadow-lg">
                <Mail className="h-4 w-4" /> {t('Créer un compte')}
              </Link>
              <Link to="/login" className="btn-secondaire min-h-[60px] flex-col gap-0.5 px-8 text-base">
                <Lock className="h-4 w-4" /> {t('Se connecter')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="bg-[#0F172A] text-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 font-titre text-lg font-bold">
              <Sprout className="h-5 w-5" /> Tanàna Madio
            </p>
            <p className="mt-4 text-white/75">{t('Système intelligent de gestion urbaine des déchets')}</p>
          </div>
          <div>
            <p className="font-titre text-lg font-bold">{t('Navigation')}</p>
            <ul className="mt-4 space-y-2.5 text-white/75">
              <li>
                <a href="#pourquoi" className="hover:text-white">
                  {t('Fonctionnalités')}
                </a>
              </li>
              <li>
                <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white">
                  {t('Accueil')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-titre text-lg font-bold">{t('Légal')}</p>
            <ul className="mt-4 space-y-2.5 text-white/75">
              <li>
                <Link to="/conditions" className="hover:text-white">
                  {t('Conditions')}
                </Link>
              </li>
              <li>
                <Link to="/conditions#confidentialite" className="hover:text-white">
                  {t('Confidentialité')}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-titre text-lg font-bold">{t('Contact')}</p>
            <ul className="mt-4 space-y-2.5 text-white/75">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> info@tananamadio.mg
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Antananarivo, Madagascar
              </li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-6 text-center text-sm text-white/70">
          © 2026 Tanàna Madio. {t('Tous droits réservés')} • {t('Créé avec ♥ pour Madagascar')}
        </p>
      </footer>
    </div>
  )
}

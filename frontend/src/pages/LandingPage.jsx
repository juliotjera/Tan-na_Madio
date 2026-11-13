// Accueil public : carte sombre animée d'Antananarivo, comment ça marche (photos), pensé pour Antananarivo,
// rôles, inscription. Photos Unsplash : voir CREDITS.md
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowDown, Building2, Home, Languages, Lock, Mail, MapPin, Rocket, Settings, Smartphone, Sprout, Truck, WifiOff } from 'lucide-react'
import { apercuPublic } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useDonnees } from '../hooks/useDonnees'
import { useLangue } from '../context/LangueContext'
import { ACCUEIL_PAR_ROLE } from '../context/AuthContext'
import { Carte, MarqueurSignalement } from '../components/map/Carte'
import { Logo, Marque } from '../components/layout/Logo'
import { nombre } from '../utils/format'

// Le parcours d'un dépôt d'ordures, du signalement au ramassage (une vraie séquence : étapes numérotées)
const ETAPES = [
  {
    image: '/images/depot-rue.webp',
    titre: 'Un habitant signale',
    texte: 'Photo, position GPS et urgence en trente secondes. S’il est déjà signalé, il suffit de confirmer « Moi aussi ».',
  },
  {
    image: '/images/camions-collecte.webp',
    titre: 'La commune planifie',
    texte: 'L’agent valide, puis l’itinéraire est calculé par les rues avec l’algorithme de Dijkstra : moins de kilomètres pour le même travail.',
  },
  {
    image: '/images/benne.webp',
    titre: 'Le camion ramasse',
    texte: 'Le chauffeur suit l’ordre des arrêts sur son téléphone, même sans réseau. L’habitant est prévenu dès que le dépôt est enlevé.',
  },
]
const ATOUTS = [
  { icone: Languages, texte: 'En français et en malagasy' },
  { icone: WifiOff, texte: 'Utilisable avec un réseau faible ou coupé' },
  { icone: Smartphone, texte: 'Installable sur un téléphone, sans magasin d’applications' },
]
const ROLES_ACCUEIL = [
  { icone: Home, titre: 'Citoyen', texte: 'Signalez les déchets dans votre quartier' },
  { icone: Building2, titre: 'Agent', texte: 'Gérez les signalements et tournées' },
  { icone: Truck, titre: 'Chauffeur', texte: 'Consultez vos tournées de collecte' },
  { icone: Settings, titre: 'Admin', texte: 'Administrez le système complet' },
]

// Entrée du héros : chaque élément se pose l'un après l'autre (animation CSS, le seul mouvement
// automatique de la page ; coupée si le téléphone demande moins de mouvement)
const poser = (rang) => ({ className: 'animate-poser', style: { animationDelay: `${rang * 90}ms` } })

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
  // carte « en direct » : état réel des signalements de la ville
  const compter = (...statuts) => points.filter((p) => statuts.includes(p.statut)).length
  const etat = [
    { libelle: 'Dépôts ramassés', valeur: donnees ? nombre(compter('collecte')) : '—', point: 'bg-or' },
    { libelle: 'En tournée', valeur: donnees ? nombre(compter('en_cours')) : '—', point: 'bg-or' },
    { libelle: 'À vérifier ou planifier', valeur: donnees ? nombre(compter('en_attente', 'valide')) : '—', point: 'bg-white/70' },
  ]
  if (connecte) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const chiffres = [
    { valeur: donnees ? nombre(donnees.collectes) : '—', libelle: 'Signalements résolus', couleur: 'text-or-clair' },
    { valeur: donnees ? nombre(donnees.citoyens) : '—', libelle: 'Utilisateurs actifs', couleur: 'text-white' },
    { valeur: donnees ? nombre(donnees.zones) : '—', libelle: 'Zones couvertes', couleur: 'text-white' },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* En-tête */}
      <header className="sticky top-0 z-[1100] border-b border-trait/70 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
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
            <Link to="/login" className="whitespace-nowrap px-1 text-sm font-semibold text-ardoise hover:text-marque sm:px-2 sm:text-[15px]">
              {t('Se connecter')}
            </Link>
            <Link to="/register" className="btn-principal whitespace-nowrap px-4 sm:px-5">
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
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sombre via-sombre/85 to-sombre/25" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_15%_20%,rgba(201,165,92,0.16),transparent_70%)]" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-or/50 to-transparent" aria-hidden />

        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <span className={`${poser(0).className} inline-flex items-center gap-2 rounded-full border border-or/40 bg-or/10 px-4 py-1.5 text-sm font-medium text-or-clair`} style={poser(0).style}>
              <Sprout className="h-4 w-4 text-or" /> {t('Bienvenue à Tanàna Madio')}
            </span>
            <h1 className={`${poser(1).className} mt-6 max-w-xl text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] text-white sm:text-[64px]`} style={poser(1).style}>
              {t('La ville propre de demain')}
            </h1>
            <p className={`${poser(2).className} mt-6 text-lg text-white/85`} style={poser(2).style}>
              {t('Système intelligent de gestion des déchets urbains')} <span className="text-or">•</span> <span className="font-semibold text-white">Madagascar 2035</span>
            </p>
            <p className={`${poser(3).className} mt-5 max-w-lg text-white/65`} style={poser(3).style}>
              {t('Rejoignez-nous pour créer une Antananarivo plus propre et durable. Ensemble, nous changeons la ville, un déchet à la fois.')}
            </p>
            <div className={`${poser(4).className} mt-9 flex flex-wrap gap-4`} style={poser(4).style}>
              <Link to="/register" className="btn-or min-h-[54px] px-7 text-base">
                <Rocket className="h-5 w-5" /> {t('Commencer maintenant')}
              </Link>
              <a href="#pourquoi" className="btn min-h-[54px] border border-white/25 bg-white/[0.04] px-7 text-base text-white backdrop-blur hover:border-or/60 hover:bg-white/[0.08]">
                {t('En savoir plus')} <ArrowDown className="h-4 w-4" />
              </a>
            </div>
            <dl className={`${poser(5).className} mt-12 grid max-w-lg grid-cols-3 divide-x divide-or/25`} style={poser(5).style}>
              {chiffres.map((c) => (
                <div key={c.libelle} className="flex flex-col-reverse px-3 first:pl-0 sm:px-6">
                  <dt className="text-xs leading-snug text-white/50 sm:text-sm">{t(c.libelle)}</dt>
                  <dd className={`chiffre text-[26px] sm:text-[34px] ${c.couleur}`}>{c.valeur}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Carte « Antananarivo » avec badges flottants */}
          <div className="animate-poser relative mx-auto hidden w-full max-w-[340px] sm:block" style={{ animationDelay: '380ms' }}>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-flotte ring-1 ring-or/20 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Marque blanc className="h-11 w-11" alt="" />
                <div>
                  <p className="font-titre text-lg font-semibold text-white">Antananarivo</p>
                  <p className="text-sm text-white/55">Madagascar</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3">
                {etat.map((l) => (
                  <li key={l.libelle} className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3 ring-1 ring-white/10">
                    <span className={`h-2.5 w-2.5 rounded-full ${l.point}`} aria-hidden />
                    <span className="flex-1 text-sm text-white/75">{t(l.libelle)}</span>
                    <span className="chiffre text-xl text-white">{l.valeur}</span>
                  </li>
                ))}
              </ul>
            </div>
            <span className="absolute -right-3 -top-3 flex animate-flotter items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-sombre shadow-lg">
              <span className="h-2 w-2 animate-clignoter rounded-full bg-or" /> {t('En direct')}
            </span>
            <span className="absolute -bottom-4 -left-3 animate-flotter-lent rounded-full bg-or px-4 py-2 text-sm font-semibold text-sombre shadow-or">
              {donnees ? `${donnees.zones} ${t('zones')}` : t('zones')}
            </span>
          </div>
        </div>
      </section>

      {/* Comment ça marche : du signalement au ramassage */}
      <section id="pourquoi" className="scroll-mt-20 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-[32px] font-bold leading-tight sm:text-[40px]">{t('Du signalement au ramassage')}</h2>
            <p className="mt-3 text-lg text-encre-doux">{t('Trois étapes, trois acteurs, une seule application.')}</p>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {ETAPES.map((e, i) => (
              <li key={e.titre}>
                <div className="group relative overflow-hidden rounded-carte shadow-carte">
                  <img src={e.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                  <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-sombre/90 font-titre text-base font-semibold text-or ring-1 ring-or/50 backdrop-blur">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold">{t(e.titre)}</h3>
                <p className="mt-2 leading-relaxed text-encre-doux">{t(e.texte)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pensé pour Antananarivo */}
      <section className="relative isolate overflow-hidden bg-sombre">
        <img src="/images/tana-toits.webp" alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_75%]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-sombre via-sombre/75 to-transparent" aria-hidden />
        <div className="mx-auto max-w-[1180px] px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-xl">
            <h2 className="text-[32px] font-bold leading-tight text-white sm:text-[40px]">{t('Pensé pour Antananarivo')}</h2>
            <p className="mt-4 text-lg text-white/80">
              {t('Des quartiers sur les collines, des rues étroites, un réseau mobile inégal : l’application est faite pour ces conditions.')}
            </p>
            <ul className="mt-8 space-y-3">
              {ATOUTS.map(({ icone: Icone, texte }) => (
                <li key={texte} className="flex items-center gap-3 text-white">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-or/40">
                    <Icone className="h-4 w-4 text-or" />
                  </span>
                  {t(texte)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rôles */}
      <section className="bg-fond py-20 sm:py-24">
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
                  className="group rounded-carte border border-trait bg-white p-8 text-center shadow-carte transition duration-300 hover:-translate-y-1 hover:border-or/50 hover:shadow-survol"
                >
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sombre text-or ring-1 ring-or/30 transition duration-300 group-hover:shadow-or">
                    <Icone className="h-8 w-8" strokeWidth={1.6} />
                  </span>
                  <h3 className="mt-5 text-2xl">{t(r.titre)}</h3>
                  <p className="mt-2 text-encre-doux">{t(r.texte)}</p>
                </Link>
              )
            })}
          </div>

          <div className="relative mx-auto mt-14 max-w-[1050px] overflow-hidden rounded-[24px] bg-sombre bg-[radial-gradient(70%_120%_at_50%_0%,rgba(201,165,92,0.2),transparent_65%)] p-10 text-center shadow-flotte ring-1 ring-or/25 sm:p-12">
            <p className="font-titre text-2xl font-semibold text-white">{t('Premiers pas avec Tanàna Madio ?')}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-or min-h-[60px] flex-col gap-0.5 px-8 text-base">
                <Mail className="h-4 w-4" /> {t('Créer un compte')}
              </Link>
              <Link to="/login" className="btn min-h-[60px] flex-col gap-0.5 border border-white/25 px-8 text-base text-white hover:border-or/60 hover:bg-white/[0.06]">
                <Lock className="h-4 w-4" /> {t('Se connecter')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="bg-sombre text-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo clair />
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

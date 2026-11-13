// Cadre de l'application connectée (version d'origine) :
// barre latérale blanche par sections, repliable (Alt+M) ; en-tête avec titre, cloche (Alt+N),
// choix de la langue, utilisateur et déconnexion ; fil d'Ariane ; barre du bas sur téléphone.
import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  KeyRound,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  MapPin,
  Menu,
  ScrollText,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useLangue } from '../../context/LangueContext'
import { ROLES } from '../../utils/format'
import { Logo, Marque } from './Logo'
import Cloche from './Cloche'

// Menus par rôle, regroupés en sections comme sur la version d'origine
export const NAVIGATION = {
  citoyen: [
    {
      section: 'Mon espace',
      liens: [
        { vers: '/citoyen', libelle: 'Accueil', icone: Home, fin: true },
        { vers: '/citoyen/signaler', libelle: 'Signaler', icone: MapPin, principal: true },
        { vers: '/citoyen/signalements', libelle: 'Mes signalements', icone: FileText },
      ],
    },
  ],
  agent_municipal: [
    { section: "Vue d'ensemble", liens: [{ vers: '/agent', libelle: 'Dashboard', icone: LayoutDashboard, fin: true }] },
    {
      section: 'Opérations',
      liens: [
        { vers: '/agent/signalements', libelle: 'Signalements', icone: TriangleAlert },
        { vers: '/agent/collectes', libelle: 'Collectes', icone: ClipboardList },
        { vers: '/agent/planifier', libelle: 'Planifier', icone: CalendarDays, principal: true },
      ],
    },
    { section: 'Ressources', liens: [{ vers: '/agent/camions', libelle: 'Camions', icone: Truck }] },
  ],
  chauffeur: [
    {
      section: 'Navigation',
      liens: [
        { vers: '/chauffeur', libelle: 'Dashboard', icone: LayoutDashboard, fin: true },
        { vers: '/chauffeur/tournees', libelle: 'Mes tournées', icone: Truck },
      ],
    },
  ],
  administrateur: [
    {
      section: "Vue d'ensemble",
      liens: [
        { vers: '/admin', libelle: 'Dashboard', icone: LayoutDashboard, fin: true },
        { vers: '/admin/stats', libelle: 'Statistiques', icone: BarChart3 },
      ],
    },
    {
      section: 'Gestion',
      liens: [
        { vers: '/admin/camions', libelle: 'Camions', icone: Truck },
        { vers: '/admin/zones', libelle: 'Zones', icone: Map },
        { vers: '/admin/utilisateurs', libelle: 'Utilisateurs', icone: Users },
        { vers: '/admin/journal', libelle: 'Journal d’activité', icone: ScrollText },
      ],
    },
  ],
}

// date du jour dans l'en-tête (« jeudi 12 novembre »)
const aujourdhui = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

const initiales = (u) => `${u?.prenom?.[0] ?? ''}${u?.nom?.[0] ?? ''}`.toUpperCase()

function lireReplie() {
  try {
    return localStorage.getItem('tanana-madio-menu') === 'replie'
  } catch {
    return false
  }
}

function LienMenu({ lien, replie, onClick }) {
  const { t } = useLangue()
  const Icone = lien.icone
  return (
    <NavLink
      to={lien.vers}
      end={lien.fin}
      onClick={onClick}
      title={replie ? t(lien.libelle) : undefined}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors duration-200 ${replie ? 'justify-center' : ''} ${
          isActive
            ? 'bg-white/[0.08] text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-or'
            : 'text-white/65 hover:bg-white/[0.05] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icone className={`h-[19px] w-[19px] shrink-0 transition-colors ${isActive ? 'text-or' : 'text-white/55 group-hover:text-white/90'}`} />
          {!replie && <span className="truncate">{t(lien.libelle)}</span>}
        </>
      )}
    </NavLink>
  )
}

function MenuSections({ sections, replie, onLien }) {
  const { t } = useLangue()
  return (
    <nav aria-label="Navigation principale" className="flex flex-col">
      {sections.map((s, i) => (
        <div key={s.section} className={i > 0 ? 'mt-3 border-t border-white/10 pt-1' : ''}>
          {replie ? <div className="h-4" /> : <p className="section-menu">{t(s.section)}</p>}
          <div className="flex flex-col gap-1">
            {s.liens.map((l) => (
              <LienMenu key={l.vers} lien={l} replie={replie} onClick={onLien} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export default function AppShell() {
  const { user, deconnecter } = useAuth()
  const { langue, setLangue, t } = useLangue()
  const navigate = useNavigate()
  const lieu = useLocation()
  const sections = NAVIGATION[user.role] ?? []
  const liens = sections.flatMap((s) => s.liens)
  const [replie, setReplie] = useState(lireReplie)
  const [tiroir, setTiroir] = useState(false)

  const basculerMenu = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setReplie((r) => {
        try {
          localStorage.setItem('tanana-madio-menu', r ? 'ouvert' : 'replie')
        } catch {
          /* préférence non mémorisée */
        }
        return !r
      })
    } else setTiroir((o) => !o)
  }, [])

  // Alt+M : menu (le raccourci Alt+N est géré par la cloche)
  useEffect(() => {
    const surTouche = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        basculerMenu()
      }
      if (e.key === 'Escape') setTiroir(false)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [basculerMenu])

  useEffect(() => setTiroir(false), [lieu.pathname])

  const sortir = async () => {
    await deconnecter()
    navigate('/login', { replace: true })
  }

  // Fil d'Ariane : accueil de l'espace / page courante
  const accueil = liens[0]
  const courant = [...liens].sort((a, b) => b.vers.length - a.vers.length).find((l) => lieu.pathname.startsWith(l.vers))
  const sousPage = lieu.pathname.startsWith('/chauffeur/tournees/') ? 'Tournée' : lieu.pathname === '/compte' ? 'Mon compte' : null

  const titreEnTete = user.role === 'administrateur' ? 'Administration' : 'Tableau de bord'
  // téléphone : 4 destinations au plus + compte
  const liensBas = [...liens.slice(0, 4), { vers: '/compte', libelle: 'Mon compte', icone: UserRound }]

  const largeur = replie ? 'lg:w-[84px]' : 'lg:w-[264px]'
  const marge = replie ? 'lg:pl-[84px]' : 'lg:pl-[264px]'

  return (
    <div className={`min-h-screen transition-[padding] ${marge}`}>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Aller au contenu
      </a>

      {/* Barre latérale (ordinateur) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-sombre bg-[radial-gradient(120%_60%_at_0%_0%,rgba(0,128,67,0.28),transparent_60%)] text-white transition-[width] duration-300 lg:flex ${largeur}`}
      >
        <div className={`flex h-[72px] items-center border-b border-white/10 ${replie ? 'justify-center' : 'px-4'}`}>
          <Link to={accueil?.vers ?? '/'} className={`flex items-center ${replie ? '' : 'w-full'}`}>
            {replie ? <Marque blanc className="h-9 w-9" /> : <Logo clair className="[&>img]:h-11" />}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <MenuSections sections={sections} replie={replie} />
        </div>
        {/* bouton de repli, sur le bord de la barre */}
        <div className="absolute -right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          <button
            type="button"
            onClick={basculerMenu}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-or/40 bg-sombre text-or shadow-carte transition hover:bg-sombre-800"
            aria-label={replie ? t('Agrandir le menu') : t('Réduire le menu')}
            title={`${replie ? t('Agrandir le menu') : t('Réduire le menu')} (Alt+M)`}
          >
            {replie ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Tiroir (téléphone, tablette) */}
      {tiroir && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ardoise/40" onClick={() => setTiroir(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-sombre text-white shadow-flotte">
            <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">
              <Logo clair className="[&>img]:h-10" />
              <button type="button" className="btn min-h-0 p-2 text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setTiroir(false)} aria-label={t('Fermer le menu')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <MenuSections sections={sections} onLien={() => setTiroir(false)} />
            </div>
            <label className="border-t border-white/10 p-4">
              <span className="etiquette text-white/80">{t('Langue')}</span>
              <select value={langue} onChange={(e) => setLangue(e.target.value)} className="champ py-2">
                <option value="fr">Français</option>
                <option value="mg">Malagasy</option>
              </select>
            </label>
          </aside>
        </div>
      )}

      {/* En-tête */}
      <header className="sticky top-0 z-30 border-b border-trait bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="flex h-[72px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <button type="button" onClick={basculerMenu} className="btn-discret min-h-0 p-2 lg:hidden" aria-label={t('Ouvrir le menu')}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-titre text-[17px] font-bold text-ardoise">{t(titreEnTete)}</p>
            <p className="hidden truncate text-xs capitalize text-encre-doux sm:block">{aujourdhui}</p>
          </div>
          <Cloche />
          <label className="hidden sm:block">
            <span className="sr-only">{t('Langue')}</span>
            <select
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
              className="rounded-full border border-trait bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-encre focus:border-vert-500 focus:outline-none"
            >
              <option value="fr">Français</option>
              <option value="mg">Malagasy</option>
            </select>
          </label>
          <Link to="/compte" className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition hover:bg-fond">
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-sm font-semibold text-ardoise">
                {user.prenom} {user.nom}
              </span>
              <span className="block text-xs text-encre-doux">{t(ROLES[user.role])}</span>
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sombre font-titre text-sm font-semibold text-or ring-2 ring-or/30">{initiales(user)}</span>
          </Link>
          <button type="button" onClick={sortir} className="btn-discret min-h-0 p-2" aria-label={t('Se déconnecter')} title={t('Se déconnecter')}>
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main id="contenu" className="mx-auto max-w-[1280px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
        {/* Fil d'Ariane */}
        {accueil && (
          <nav aria-label="Fil d’Ariane" className="mb-4 flex items-center gap-2 text-sm text-encre-doux">
            <Link to={accueil.vers} className="hover:text-vert">
              {t(accueil.libelle)}
            </Link>
            {courant && courant.vers !== accueil.vers && (
              <>
                <span aria-hidden>/</span>
                <span className={sousPage ? '' : 'font-semibold text-ardoise'}>{t(courant.libelle)}</span>
              </>
            )}
            {sousPage && (
              <>
                <span aria-hidden>/</span>
                <span className="font-semibold text-ardoise">{t(sousPage)}</span>
              </>
            )}
          </nav>
        )}
        {user?.mdp_provisoire && lieu.pathname !== '/compte' && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-ambre/40 bg-ambre-50 px-4 py-3 text-sm text-ambre-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <p className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 shrink-0" /> {t('Vous utilisez un mot de passe provisoire. Choisissez le vôtre pour sécuriser votre compte.')}
            </p>
            <Link to="/compte" className="btn-principal min-h-[38px] shrink-0">
              {t('Changer mon mot de passe')}
            </Link>
          </div>
        )}
        {/* une seule transition, à chaque changement de page : le contenu se pose en douceur */}
        <div key={lieu.pathname} className="animate-entree">
          <Outlet />
        </div>
      </main>

      {/* Barre du bas (téléphone) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Raccourcis">
        <ul className="mx-auto flex max-w-lg">
          {liensBas.map((l) => {
            const Icone = l.icone
            return (
              <li key={l.vers} className="flex-1">
                <NavLink
                  to={l.vers}
                  end={l.fin}
                  className={({ isActive }) => `flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold transition ${isActive ? 'text-vert' : 'text-encre-pale'}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className={`flex h-8 w-12 items-center justify-center rounded-full transition ${l.principal ? 'bg-vert text-white' : isActive ? 'bg-vert-50' : ''}`}>
                        <Icone className="h-5 w-5" />
                      </span>
                      <span className="max-w-full truncate">{t(l.libelle)}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

// Cadre de l'application connectée : barre latérale (ordinateur), barre du bas (téléphone)
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  MapPinned,
  Plus,
  Route,
  Truck,
  UserRound,
  Users,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../utils/format'
import { Logo } from './Logo'

export const NAVIGATION = {
  citoyen: [
    { vers: '/citoyen', libelle: 'Carte', icone: Map, fin: true },
    { vers: '/citoyen/signaler', libelle: 'Signaler', icone: Plus, principal: true },
    { vers: '/citoyen/signalements', libelle: 'Mes signalements', court: 'Mes envois', icone: ListChecks },
  ],
  agent_municipal: [
    { vers: '/agent', libelle: 'Tableau de bord', court: 'Accueil', icone: LayoutDashboard, fin: true },
    { vers: '/agent/signalements', libelle: 'À valider', icone: ClipboardCheck },
    { vers: '/agent/planifier', libelle: 'Planifier une tournée', court: 'Planifier', icone: Route, principal: true },
    { vers: '/agent/collectes', libelle: 'Collectes', icone: ListChecks },
    { vers: '/agent/camions', libelle: 'Camions', icone: Truck },
  ],
  chauffeur: [{ vers: '/chauffeur', libelle: 'Mes tournées', court: 'Tournées', icone: Route, fin: false }],
  administrateur: [
    { vers: '/admin', libelle: 'Tableau de bord', court: 'Accueil', icone: LayoutDashboard, fin: true },
    { vers: '/admin/utilisateurs', libelle: 'Utilisateurs', icone: Users },
    { vers: '/admin/camions', libelle: 'Camions', icone: Truck },
    { vers: '/admin/zones', libelle: 'Zones', icone: MapPinned },
    { vers: '/admin/stats', libelle: 'Statistiques', court: 'Stats', icone: BarChart3 },
  ],
}

const initiales = (u) => `${u?.prenom?.[0] ?? ''}${u?.nom?.[0] ?? ''}`.toUpperCase()

function LienLateral({ lien }) {
  const Icone = lien.icone
  return (
    <NavLink
      to={lien.vers}
      end={lien.fin}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
          isActive ? 'bg-white/10 text-white' : 'text-bleu-100/70 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icone className={`h-[18px] w-[18px] ${isActive ? 'text-ciel' : ''}`} />
          {lien.libelle}
        </>
      )}
    </NavLink>
  )
}

export default function AppShell() {
  const { user, deconnecter } = useAuth()
  const navigate = useNavigate()
  const liens = NAVIGATION[user.role] ?? []
  const sortir = async () => {
    await deconnecter()
    navigate('/login', { replace: true })
  }
  // en bas sur téléphone : jusqu'à 4 destinations + le compte
  const liensBas = [...liens.slice(0, 4), { vers: '/compte', libelle: 'Compte', icone: UserRound }]

  return (
    <div className="min-h-screen lg:pl-[264px]">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Aller au contenu
      </a>

      {/* Barre latérale (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-nuit px-4 py-6 lg:flex">
        <Logo clair className="px-2" />
        <nav className="mt-9 flex flex-col gap-1" aria-label="Navigation principale">
          {liens.map((l) => (
            <LienLateral key={l.vers} lien={l} />
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <NavLink to="/compte" className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ciel font-titre text-sm font-bold text-nuit">{initiales(user)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {user.prenom} {user.nom}
              </span>
              <span className="block text-xs text-bleu-100/60">{ROLES[user.role]}</span>
            </span>
          </NavLink>
          <button type="button" onClick={sortir} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-bleu-100/70 transition hover:bg-white/5 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* Barre du haut (téléphone, tablette) */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-trait bg-white/90 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <Logo />
        <span className="rounded-full bg-bleu-100 px-2.5 py-1 text-xs font-semibold text-bleu">{ROLES[user.role]}</span>
      </header>

      <main id="contenu" className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
        <Outlet />
      </main>

      {/* Barre de navigation du bas (téléphone) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-trait bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navigation principale">
        <ul className="mx-auto flex max-w-lg">
          {liensBas.map((l) => {
            const Icone = l.icone
            return (
              <li key={l.vers} className="flex-1">
                <NavLink
                  to={l.vers}
                  end={l.fin}
                  className={({ isActive }) => `flex flex-col items-center gap-1 px-1 pb-2 pt-2.5 text-[11px] font-semibold transition ${isActive ? 'text-nuit' : 'text-encre-pale'}`}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                          l.principal ? 'bg-bleu text-white' : isActive ? 'bg-bleu-100 text-bleu' : ''
                        }`}
                      >
                        <Icone className="h-5 w-5" />
                      </span>
                      <span className="truncate">{l.court ?? l.libelle}</span>
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

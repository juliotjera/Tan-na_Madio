// Routes de l'application, par rôle (les pages sont chargées à la demande)
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { Chargement } from './components/common/ui'
import { GardeErreur, TitreDePage } from './components/layout/Garde'

const page = (charger) => lazy(charger)

const LandingPage = page(() => import('./pages/LandingPage'))
// connexion et inscription : une seule page, le volet passe de l'une à l'autre
const Authentification = page(() => import('./pages/auth/Authentification'))
const Compte = page(() => import('./pages/Compte'))
const Introuvable = page(() => import('./pages/Introuvable'))
const Conditions = page(() => import('./pages/Conditions'))

const CitoyenDashboard = page(() => import('./pages/citoyen/Dashboard'))
const Signaler = page(() => import('./pages/citoyen/Signaler'))
const MesSignalements = page(() => import('./pages/citoyen/MesSignalements'))

const AgentDashboard = page(() => import('./pages/agent/Dashboard'))
const SignalementsEnAttente = page(() => import('./pages/agent/SignalementsEnAttente'))
const PlanifierCollecte = page(() => import('./pages/agent/PlanifierCollecte'))
const Collectes = page(() => import('./pages/agent/Collectes'))
const Camions = page(() => import('./pages/agent/Camions'))

const ChauffeurDashboard = page(() => import('./pages/chauffeur/Dashboard'))
const MesTournees = page(() => import('./pages/chauffeur/MesTournees'))
const DetailTournee = page(() => import('./pages/chauffeur/DetailTournee'))

const AdminDashboard = page(() => import('./pages/admin/Dashboard'))
const Utilisateurs = page(() => import('./pages/admin/Utilisateurs'))
const GestionCamions = page(() => import('./pages/admin/GestionCamions'))
const Zones = page(() => import('./pages/admin/Zones'))
const Stats = page(() => import('./pages/admin/Stats'))
const Journal = page(() => import('./pages/admin/Journal'))

const AGENTS = ['agent_municipal', 'administrateur']

export default function App() {
  const { pathname } = useLocation()
  return (
    <GardeErreur cle={pathname}>
      <TitreDePage />
      <Suspense fallback={<Chargement />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Authentification />} />
        <Route path="/register" element={<Authentification />} />
        <Route path="/conditions" element={<Conditions />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/compte" element={<Compte />} />

            <Route element={<ProtectedRoute roles={['citoyen']} />}>
              <Route path="/citoyen" element={<CitoyenDashboard />} />
              <Route path="/citoyen/signaler" element={<Signaler />} />
              <Route path="/citoyen/signalements" element={<MesSignalements />} />
            </Route>

            <Route element={<ProtectedRoute roles={AGENTS} />}>
              <Route path="/agent" element={<AgentDashboard />} />
              <Route path="/agent/signalements" element={<SignalementsEnAttente />} />
              <Route path="/agent/planifier" element={<PlanifierCollecte />} />
              <Route path="/agent/collectes" element={<Collectes />} />
              <Route path="/agent/camions" element={<Camions />} />
            </Route>

            <Route element={<ProtectedRoute roles={['chauffeur', 'administrateur']} />}>
              <Route path="/chauffeur" element={<ChauffeurDashboard />} />
              <Route path="/chauffeur/tournees" element={<MesTournees />} />
              <Route path="/chauffeur/tournees/:id" element={<DetailTournee />} />
            </Route>

            <Route element={<ProtectedRoute roles={['administrateur']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/utilisateurs" element={<Utilisateurs />} />
              <Route path="/admin/camions" element={<GestionCamions />} />
              <Route path="/admin/zones" element={<Zones />} />
              <Route path="/admin/stats" element={<Stats />} />
              <Route path="/admin/journal" element={<Journal />} />
            </Route>
          </Route>
        </Route>

        <Route path="/accueil" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Introuvable />} />
      </Routes>
      </Suspense>
    </GardeErreur>
  )
}

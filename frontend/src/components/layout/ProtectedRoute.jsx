// Accès réservé : connexion obligatoire, et rôle autorisé
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ACCUEIL_PAR_ROLE } from '../../context/AuthContext'

export default function ProtectedRoute({ roles }) {
  const { connecte, user } = useAuth()
  const lieu = useLocation()
  if (!connecte) return <Navigate to="/login" replace state={{ depuis: lieu.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={ACCUEIL_PAR_ROLE[user.role] ?? '/'} replace />
  return <Outlet />
}

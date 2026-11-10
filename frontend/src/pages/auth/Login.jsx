// Connexion, puis redirection vers l'espace du rôle (ou la page demandée avant)
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ACCUEIL_PAR_ROLE } from '../../context/AuthContext'
import { messageErreur } from '../../api/axiosConfig'
import { Champ, Spinner } from '../../components/common/ui'
import { ROLES } from '../../utils/format'
import CadreAuth from './CadreAuth'

// Comptes de la base de démonstration (désactivables avec VITE_COMPTES_DEMO=false)
const DEMO = import.meta.env.VITE_COMPTES_DEMO !== 'false'
const COMPTES = [
  ['citoyen@tananamadio.mg', 'citoyen'],
  ['agent@tananamadio.mg', 'agent_municipal'],
  ['chauffeur@tananamadio.mg', 'chauffeur'],
  ['admin@tananamadio.mg', 'administrateur'],
]

export default function Login() {
  const { connecter, connecte, user } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [voir, setVoir] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)

  if (connecte && !envoi) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const u = await connecter(email.trim(), mdp)
      toast.success(`Bonjour ${u.prenom}`)
      const depuis = lieu.state?.depuis
      navigate(depuis && depuis !== '/login' ? depuis : ACCUEIL_PAR_ROLE[u.role], { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <CadreAuth titre="Se connecter" texte="Accédez à votre espace : signalements, tournées ou administration.">
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        <Champ libelle="Adresse e-mail">
          {(id) => <input id={id} type="email" className="champ" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />}
        </Champ>
        <Champ libelle="Mot de passe">
          {(id) => (
            <div className="relative">
              <input id={id} type={voir ? 'text' : 'password'} className="champ pr-12" autoComplete="current-password" value={mdp} onChange={(e) => setMdp(e.target.value)} required />
              <button type="button" onClick={() => setVoir(!voir)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-encre-pale hover:text-ardoise" aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {voir ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          )}
        </Champ>
        {erreur && (
          <p className="rounded-xl bg-alerte-50 px-4 py-3 text-sm text-alerte-700" role="alert">
            {erreur}
          </p>
        )}
        <button type="submit" className="btn-principal w-full min-h-[48px] text-base" disabled={envoi || !email || !mdp}>
          {envoi && <Spinner className="h-4 w-4 text-white" />}
          Se connecter
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-encre-doux">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-semibold text-vert underline-offset-4 hover:underline">
          Créer un compte citoyen
        </Link>
      </p>

      {DEMO && (
        <div className="mt-8 rounded-xl border border-dashed border-trait p-4">
          <p className="text-sm font-semibold text-ardoise">Comptes de démonstration</p>
          <p className="mt-0.5 text-xs text-encre-pale">Mot de passe : Admin2025!</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {COMPTES.map(([adresse, role]) => (
              <button
                key={adresse}
                type="button"
                onClick={() => {
                  setEmail(adresse)
                  setMdp('Admin2025!')
                }}
                className="rounded-xl border border-trait bg-white px-3 py-2 text-left text-sm transition hover:border-vert-500 hover:bg-vert-50"
              >
                <span className="block font-medium text-ardoise">{ROLES[role]}</span>
                <span className="block truncate text-xs text-encre-pale">{adresse}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </CadreAuth>
  )
}

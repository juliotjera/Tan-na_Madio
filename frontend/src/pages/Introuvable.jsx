import { Link } from 'react-router-dom'
import { Logo } from '../components/layout/Logo'

export default function Introuvable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="chiffre mt-10 text-[72px] leading-none text-foret">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Cette page n’existe pas</h1>
      <p className="mt-2 max-w-sm text-encre-doux">Le lien est peut-être ancien ou mal recopié.</p>
      <Link to="/" className="btn-principal mt-8">
        Retour à l’accueil
      </Link>
    </div>
  )
}

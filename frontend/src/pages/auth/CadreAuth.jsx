// Mise en page des écrans de connexion et d'inscription : formulaire à gauche,
// vue d'Antananarivo à droite (photo Unsplash, voir CREDITS.md)
import { Link } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'

export default function CadreAuth({ titre, texte, children }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_minmax(420px,42%)]">
      <div className="flex flex-col px-5 pb-10 pt-[max(24px,env(safe-area-inset-top))] sm:px-10">
        <Link to="/" className="self-start" aria-label="Accueil Tanàna Madio">
          <Logo />
        </Link>
        <div className="mx-auto my-auto w-full max-w-[420px] py-10">
          <h1 className="text-[32px] font-semibold leading-tight">{titre}</h1>
          {texte && <p className="mt-2 text-encre-doux">{texte}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-sombre lg:block">
        <img src="/images/tana-aerien.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[50%_70%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-sombre via-sombre/45 to-sombre/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-10">
          <p className="max-w-sm font-titre text-[28px] font-semibold leading-snug text-white">Moins de route pour les camions, moins d’ordures dans les rues.</p>
          <p className="mt-3 text-sm text-vert-100/80">Antananarivo, autour du lac Anosy</p>
        </div>
      </aside>
    </div>
  )
}

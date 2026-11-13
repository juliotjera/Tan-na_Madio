// Mise en page des écrans de connexion et d'inscription : formulaire à gauche,
// vue d'Antananarivo à droite (photo Unsplash, voir CREDITS.md)
import { Link } from 'react-router-dom'
import { Logo, Marque } from '../../components/layout/Logo'

export default function CadreAuth({ titre, texte, children }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_minmax(440px,44%)]">
      <div className="flex flex-col px-5 pb-10 pt-[max(24px,env(safe-area-inset-top))] sm:px-10">
        <Link to="/" className="self-start" aria-label="Accueil Tanàna Madio">
          <Logo />
        </Link>
        <div className="animate-poser mx-auto my-auto w-full max-w-[420px] py-10">
          <span className="block h-1 w-10 rounded-full bg-or" aria-hidden />
          <h1 className="mt-5 text-[34px] leading-tight">{titre}</h1>
          {texte && <p className="mt-2 text-encre-doux">{texte}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-sombre lg:block">
        <img src="/images/tana-aerien.webp" alt="" className="absolute inset-0 h-full w-full scale-[1.02] object-cover object-[50%_70%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-sombre via-sombre/55 to-sombre/20" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_0%_100%,rgba(201,165,92,0.2),transparent_70%)]" aria-hidden />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-or/60 to-transparent" aria-hidden />
        <div className="absolute left-10 top-10 flex items-center gap-3 rounded-full bg-sombre/50 py-1.5 pl-1.5 pr-4 ring-1 ring-or/30 backdrop-blur-md">
          <Marque blanc className="h-8 w-8" alt="" />
          <span className="text-sm font-medium text-white/85">Signaler · Collecter · Ville propre</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-10">
          <span className="block h-px w-14 bg-or" aria-hidden />
          <p className="mt-5 max-w-sm font-titre text-[30px] font-semibold leading-snug text-white">Moins de route pour les camions, moins d’ordures dans les rues.</p>
          <p className="mt-3 text-sm text-or-clair/80">Antananarivo, autour du lac Anosy</p>
        </div>
      </aside>
    </div>
  )
}

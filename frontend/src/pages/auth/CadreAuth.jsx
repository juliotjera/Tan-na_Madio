// Mise en page des écrans de connexion et d'inscription
import { Link } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'

export default function CadreAuth({ titre, texte, children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,40%)]">
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
      <aside className="relative hidden overflow-hidden bg-sombre lg:block" aria-hidden>
        {/* Une tournée stylisée : les arrêts reliés au plus court */}
        <svg viewBox="0 0 400 600" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="rues" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="#1F3A2E" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="400" height="600" fill="url(#rues)" />
          <path d="M60 520 L300 160 M140 440 L340 80 M220 360 L60 120" fill="none" stroke="#4B5563" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
          <path d="M60 520 L60 440 L140 440 L140 360 L220 360 L220 280 L300 280 L300 160 L340 160 L340 80" fill="none" stroke="#6EE7B7" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {[
            [60, 520, '#FFFFFF'],
            [140, 440, '#F59E0B'],
            [220, 360, '#FFFFFF'],
            [300, 280, '#F59E0B'],
            [340, 80, '#FFFFFF'],
          ].map(([x, y, c], i) => (
            <rect key={i} x={x - 11} y={y - 11} width="22" height="22" rx="5" fill={c} stroke="#111827" strokeWidth="4" />
          ))}
        </svg>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sombre via-sombre/90 to-transparent p-10 pt-24">
          <p className="max-w-sm font-titre text-[26px] font-semibold leading-snug text-white">Moins de route pour les camions, moins d’ordures dans les rues.</p>
          <p className="mt-3 text-sm text-vert-300">Tanàna Madio · Antananarivo</p>
        </div>
      </aside>
    </div>
  )
}

// Marque d'origine : un badge rond vert sombre portant une épingle de localisation émeraude
export function Marque({ className = 'h-9 w-9' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id="tm-fond" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1F5C40" />
          <stop offset="100%" stopColor="#0B2A1C" />
        </radialGradient>
        <linearGradient id="tm-epingle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" fill="url(#tm-fond)" stroke="#10B981" strokeWidth="3" />
      <path d="M32 13c-7.7 0-13.5 5.9-13.5 13.3 0 9.6 13.5 23.7 13.5 23.7s13.5-14.1 13.5-23.7C45.5 18.9 39.7 13 32 13z" fill="url(#tm-epingle)" />
      <circle cx="32" cy="26.5" r="5" fill="#ECFDF5" />
    </svg>
  )
}

// Logo de l'application : badge + nom (avec « Ville Propre » sur la page d'accueil)
export function Logo({ clair = false, sousTitre = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {sousTitre ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-vert-500 shadow-sm shadow-vert-500/30">
          <Marque className="h-8 w-8" />
        </span>
      ) : (
        <Marque className="h-9 w-9 shrink-0" />
      )}
      <span className={`leading-tight ${sousTitre ? 'max-[400px]:sr-only' : ''}`}>
        <span className={`block whitespace-nowrap font-titre text-[19px] font-bold ${clair ? 'text-white' : 'text-ardoise'}`}>Tanàna Madio</span>
        {sousTitre && <span className={`hidden text-xs sm:block ${clair ? 'text-vert-100/70' : 'text-encre-doux'}`}>Ville Propre</span>}
      </span>
    </span>
  )
}

// Immatriculation d'un camion
export function Plaque({ numero, className = '' }) {
  return (
    <span className={`plaque ${className}`} title={`Camion ${numero}`}>
      <span aria-hidden>MG</span>
      <span>{numero}</span>
    </span>
  )
}

// Marque : un itinéraire à angles droits (les rues) et trois arrêts carrés, comme la signalétique
export function Marque({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="13" fill="#0E518D" />
      <path d="M15 47 H30 V31 H47 V16" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
      <rect x="9.5" y="41.5" width="11" height="11" rx="2.5" fill="#FFFFFF" />
      <rect x="24.5" y="25.5" width="11" height="11" rx="2.5" fill="#E8A317" stroke="#0E518D" strokeWidth="2" />
      <rect x="41.5" y="10.5" width="11" height="11" rx="2.5" fill="#FFFFFF" />
    </svg>
  )
}

export function Logo({ clair = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Marque className="h-8 w-8 shrink-0" />
      <span className={`font-titre text-[21px] font-bold leading-none ${clair ? 'text-white' : 'text-nuit'}`}>Tanàna Madio</span>
    </span>
  )
}

// Plaque d'immatriculation d'un camion
export function Plaque({ numero, className = '' }) {
  return (
    <span className={`plaque ${className}`} title={`Camion ${numero}`}>
      <span aria-hidden>MG</span>
      <span>{numero}</span>
    </span>
  )
}

// Marque : un itinéraire à trois arrêts (le cœur du service), et le nom
export function Marque({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#052E16" />
      <path d="M14 44 C 22 44, 22 30, 32 30 S 42 18, 50 18" fill="none" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" />
      <circle cx="14" cy="44" r="5.5" fill="#F0FDF4" />
      <circle cx="32" cy="30" r="5.5" fill="#F59E0B" />
      <circle cx="50" cy="18" r="5.5" fill="#F0FDF4" />
    </svg>
  )
}

export function Logo({ clair = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Marque className="h-8 w-8 shrink-0" />
      <span className={`font-titre text-[19px] font-bold tracking-tight ${clair ? 'text-white' : 'text-foret'}`}>Tanàna Madio</span>
    </span>
  )
}

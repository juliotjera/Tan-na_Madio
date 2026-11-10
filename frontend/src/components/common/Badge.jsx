import { STATUTS_CAMION, STATUTS_COLLECTE, STATUTS_SIGNALEMENT, URGENCES } from '../../utils/format'

const TABLES = { signalement: STATUTS_SIGNALEMENT, collecte: STATUTS_COLLECTE, camion: STATUTS_CAMION }

// Statut : pastille discrète, pleine seulement quand le travail est fini
export function StatutBadge({ statut, type = 'signalement' }) {
  const s = TABLES[type][statut] ?? { libelle: statut, fond: 'bg-slate-100 text-slate-600 ring-slate-300/60' }
  return <span className={`inline-flex items-center whitespace-nowrap rounded-[5px] px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.fond}`}>{s.libelle}</span>
}

// Urgence : un point de couleur et le mot (jamais la couleur seule)
export function UrgenceBadge({ urgence, compact = false }) {
  const u = URGENCES[urgence] ?? URGENCES.moyen
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-0.5 text-xs font-semibold ${u.fond}`}>
      <span className="h-2 w-2 rounded-[2px]" style={{ background: u.couleur }} aria-hidden />
      {compact ? u.libelle : `Urgence ${u.libelle.toLowerCase()}`}
    </span>
  )
}

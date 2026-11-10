// Libellés, couleurs et formats partagés (un seul vocabulaire dans toute l'interface)
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns'
import { fr } from 'date-fns/locale'

export const URGENCES = {
  faible: { libelle: 'Faible', couleur: '#64748B', fond: 'bg-slate-100 text-slate-700' },
  moyen: { libelle: 'Moyenne', couleur: '#F59E0B', fond: 'bg-ambre-100 text-ambre-700' },
  eleve: { libelle: 'Élevée', couleur: '#EA580C', fond: 'bg-orange-100 text-orange-800' },
  critique: { libelle: 'Critique', couleur: '#DC2626', fond: 'bg-alerte-100 text-alerte-700' }, // le rouge est réservé à ce niveau
}

export const STATUTS_SIGNALEMENT = {
  en_attente: { libelle: 'En attente', fond: 'bg-ambre-50 text-ambre-700 ring-ambre/30' },
  valide: { libelle: 'Validé', fond: 'bg-vert-50 text-vert-700 ring-vert/30' },
  en_cours: { libelle: 'En tournée', fond: 'bg-sky-50 text-sky-800 ring-sky-300/50' },
  collecte: { libelle: 'Collecté', fond: 'bg-vert text-white ring-vert' },
  rejete: { libelle: 'Rejeté', fond: 'bg-slate-100 text-slate-600 ring-slate-300/60' },
}

export const STATUTS_COLLECTE = {
  planifiee: { libelle: 'Planifiée', fond: 'bg-ambre-50 text-ambre-700 ring-ambre/30' },
  en_cours: { libelle: 'En cours', fond: 'bg-sky-50 text-sky-800 ring-sky-300/50' },
  terminee: { libelle: 'Terminée', fond: 'bg-vert text-white ring-vert' },
  annulee: { libelle: 'Annulée', fond: 'bg-slate-100 text-slate-600 ring-slate-300/60' },
}

export const STATUTS_CAMION = {
  disponible: { libelle: 'Disponible', fond: 'bg-vert-50 text-vert-700 ring-vert/30' },
  en_tournee: { libelle: 'En tournée', fond: 'bg-sky-50 text-sky-800 ring-sky-300/50' },
  en_maintenance: { libelle: 'En maintenance', fond: 'bg-ambre-50 text-ambre-700 ring-ambre/30' },
  hors_service: { libelle: 'Hors service', fond: 'bg-slate-100 text-slate-600 ring-slate-300/60' },
}

export const ROLES = {
  citoyen: 'Citoyen',
  agent_municipal: 'Agent municipal',
  chauffeur: 'Chauffeur',
  administrateur: 'Administrateur',
}

// Points éco : paliers de reconnaissance du citoyen
export const PALIERS = [
  { seuil: 0, nom: 'Nouveau voisin' },
  { seuil: 25, nom: 'Citoyen actif' },
  { seuil: 75, nom: 'Citoyen engagé' },
  { seuil: 150, nom: 'Ambassadeur propreté' },
  { seuil: 300, nom: 'Gardien de Tanàna' },
]
export function palier(points = 0) {
  const i = PALIERS.findLastIndex((p) => points >= p.seuil)
  const actuel = PALIERS[i]
  const suivant = PALIERS[i + 1] ?? null
  const progression = suivant ? (points - actuel.seuil) / (suivant.seuil - actuel.seuil) : 1
  return { actuel, suivant, progression }
}

const date = (d) => (d instanceof Date ? d : new Date(d))

export const dateCourte = (d) => (d ? format(date(d), 'd MMM yyyy', { locale: fr }) : '—')
export const dateHeure = (d) => (d ? format(date(d), "d MMM yyyy 'à' HH:mm", { locale: fr }) : '—')
export const ilYa = (d) => (d ? `il y a ${formatDistanceToNowStrict(date(d), { locale: fr })}` : '—')

// « aujourd'hui à 7 h 30 », « demain à 8 h », sinon la date
export function jourHeure(d) {
  if (!d) return '—'
  const x = date(d)
  const heure = format(x, "H 'h' mm", { locale: fr }).replace(' 00', '')
  if (isToday(x)) return `Aujourd'hui à ${heure}`
  if (isTomorrow(x)) return `Demain à ${heure}`
  if (isYesterday(x)) return `Hier à ${heure}`
  return `${format(x, 'EEEE d MMM', { locale: fr })} à ${heure}`
}

export const km = (v) => (v == null ? '—' : `${Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km`)
export const kg = (v) => (v == null ? '—' : `${Math.round(Number(v)).toLocaleString('fr-FR')} kg`)
export const nombre = (v) => (v == null ? '—' : Number(v).toLocaleString('fr-FR'))
export function duree(minutes) {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

export const pluriel = (n, un, plusieurs = `${un}s`) => `${nombre(n)} ${n > 1 ? plusieurs : un}`

// Graphiques Recharts aux couleurs de l'interface (émeraude, ambre) : axes discrets, grille horizontale
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const axe = { fontSize: 12, fill: '#9CA3AF' }
const infobulle = {
  contentStyle: { borderRadius: 12, border: '1px solid #E1E6E1', boxShadow: '0 20px 40px -16px rgba(6,42,28,.35)', fontSize: 13 },
  labelStyle: { color: '#0B1F17', fontWeight: 600 },
}
const jour = (d) => format(parseISO(d), 'd MMM', { locale: fr })

// Surface sous la courbe : dégradé de la couleur vers le transparent
function Degrade({ id, couleur }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={couleur} stopOpacity={0.28} />
        <stop offset="100%" stopColor={couleur} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
}

// Évolution des signalements jour par jour
export function CourbeEvolution({ series, hauteur = 280, couleur = '#111820' }) {
  const donnees = series.map((p) => ({ ...p, jour: jour(p.date) }))
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <AreaChart data={donnees} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <Degrade id="degrade-evolution" couleur={couleur} />
        <CartesianGrid stroke="#EEF2F0" vertical={false} />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} />
        <Area type="linear" dataKey="signalements" name="Signalements" stroke={couleur} strokeWidth={2.25} fill="url(#degrade-evolution)" dot={false} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// Activité jour par jour : signalements reçus et dépôts ramassés
export function CourbeActivite({ series, hauteur = 280 }) {
  const donnees = series.map((p) => ({ ...p, jour: jour(p.date) }))
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={1} barCategoryGap="20%">
        <CartesianGrid stroke="#EEF2F0" vertical={false} />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#ECFDF5' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="signalements" name="Signalements reçus" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="collectes" name="Dépôts ramassés" fill="#C9A55C" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Performance mensuelle (tableau de bord) : signalements reçus et dépôts ramassés, jour par jour.
// Des barres plutôt qu'une courbe : les comptes journaliers sont irréguliers et une courbe lissée les déformerait.
export function CourbePerformance({ series, hauteur = 210 }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={series.map((p) => ({ ...p, jour: jour(p.date) }))} margin={{ top: 8, right: 4, bottom: 0, left: -22 }} barGap={1} barCategoryGap="18%">
        <CartesianGrid stroke="#EEF2F0" vertical={false} />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={false} minTickGap={36} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip {...infobulle} cursor={{ fill: '#ECFDF5' }} />
        <Bar dataKey="signalements" name="Reçus" fill="#C9A55C" radius={[3, 3, 0, 0]} />
        <Bar dataKey="collectes" name="Ramassés" fill="#111820" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BarresZones({ zones, hauteur = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={zones} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={4}>
        <CartesianGrid stroke="#EEF2F0" vertical={false} />
        <XAxis dataKey="nom" tick={{ ...axe, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#ECFDF5' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="total_signalements" name="Signalements" fill="#8CC5A2" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collectes" name="Ramassés" fill="#111820" radius={[4, 4, 0, 0]} />
        <Bar dataKey="en_attente" name="En attente" fill="#F59E0B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

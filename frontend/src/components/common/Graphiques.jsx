// Graphiques Recharts aux couleurs de l'interface
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const axe = { fontSize: 12, fill: '#7D8F83' }
const infobulle = {
  contentStyle: { borderRadius: 12, border: '1px solid #D9E6DD', boxShadow: '0 12px 32px -12px rgba(5,46,22,.35)', fontSize: 13 },
  labelStyle: { color: '#052E16', fontWeight: 600 },
}

// Activité jour par jour (ou semaine par semaine) : barres groupées, lisibles même avec peu de valeurs
export function CourbeActivite({ series, hauteur = 280 }) {
  const donnees = series.map((p) => ({ ...p, jour: format(parseISO(p.date), 'd MMM', { locale: fr }) }))
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={1} barCategoryGap="20%">
        <CartesianGrid stroke="#E7EFE9" vertical={false} />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#F0FDF4' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="signalements" name="Signalements reçus" fill="#F59E0B" radius={[3, 3, 0, 0]} />
        <Bar dataKey="collectes" name="Dépôts ramassés" fill="#15803D" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BarresZones({ zones, hauteur = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={zones} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={4}>
        <CartesianGrid stroke="#E7EFE9" vertical={false} />
        <XAxis dataKey="nom" tick={{ ...axe, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#F0FDF4' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="total_signalements" name="Signalements" fill="#14532D" radius={[6, 6, 0, 0]} />
        <Bar dataKey="collectes" name="Ramassés" fill="#22C55E" radius={[6, 6, 0, 0]} />
        <Bar dataKey="en_attente" name="En attente" fill="#F59E0B" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

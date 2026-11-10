// Graphiques Recharts aux couleurs de l'interface
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const axe = { fontSize: 12, fill: '#8592A3' }
const infobulle = {
  contentStyle: { borderRadius: 8, border: '1px solid #DCE2EA', boxShadow: '0 16px 40px -16px rgba(12,26,43,.45)', fontSize: 13 },
  labelStyle: { color: '#0C1A2B', fontWeight: 600 },
}

// Activité jour par jour (ou semaine par semaine) : barres groupées, lisibles même avec peu de valeurs
export function CourbeActivite({ series, hauteur = 280 }) {
  const donnees = series.map((p) => ({ ...p, jour: format(parseISO(p.date), 'd MMM', { locale: fr }) }))
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={1} barCategoryGap="20%">
        <CartesianGrid stroke="#E6EBF1" vertical={false} />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#EEF4FA' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="signalements" name="Signalements reçus" fill="#E8A317" radius={[2, 2, 0, 0]} />
        <Bar dataKey="collectes" name="Dépôts ramassés" fill="#0E518D" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BarresZones({ zones, hauteur = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <BarChart data={zones} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={4}>
        <CartesianGrid stroke="#E6EBF1" vertical={false} />
        <XAxis dataKey="nom" tick={{ ...axe, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={axe} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...infobulle} cursor={{ fill: '#EEF4FA' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="total_signalements" name="Signalements" fill="#8DB5DE" radius={[3, 3, 0, 0]} />
        <Bar dataKey="collectes" name="Ramassés" fill="#0E518D" radius={[3, 3, 0, 0]} />
        <Bar dataKey="en_attente" name="En attente" fill="#E8A317" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

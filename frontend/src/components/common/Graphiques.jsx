// Graphiques Recharts aux couleurs de la version d'origine (émeraude, bleu, ambre)
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

const axe = { fontSize: 12, fill: '#9CA3AF' }
const infobulle = {
  contentStyle: { borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 20px 40px -16px rgba(6,78,59,.35)', fontSize: 13 },
  labelStyle: { color: '#111827', fontWeight: 600 },
}
const jour = (d) => format(parseISO(d), 'd MMM', { locale: fr })

// Évolution des signalements (courbe lissée, comme sur la version d'origine)
export function CourbeEvolution({ series, hauteur = 280, couleur = '#3B82F6' }) {
  const donnees = series.map((p) => ({ ...p, jour: jour(p.date) }))
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <LineChart data={donnees} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="#EEF2F0" strokeDasharray="3 3" />
        <XAxis dataKey="jour" tick={axe} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} minTickGap={28} />
        <YAxis tick={axe} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} allowDecimals={false} />
        <Tooltip {...infobulle} />
        <Line type="monotone" dataKey="signalements" name="Signalements" stroke={couleur} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
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
        <Bar dataKey="collectes" name="Dépôts ramassés" fill="#10B981" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Performance mensuelle : courbe épurée sans axes (tableau de bord)
export function CourbePerformance({ series, hauteur = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={hauteur}>
      <LineChart data={series.map((p) => ({ ...p, jour: jour(p.date) }))} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
        <XAxis dataKey="jour" hide />
        <YAxis hide domain={[0, 'dataMax + 1']} />
        <Tooltip {...infobulle} />
        <Line type="monotone" dataKey="signalements" name="Signalements" stroke="#10B981" strokeWidth={2.5} dot={false} />
      </LineChart>
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
        <Bar dataKey="total_signalements" name="Signalements" fill="#6EE7B7" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collectes" name="Ramassés" fill="#10B981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="en_attente" name="En attente" fill="#F59E0B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

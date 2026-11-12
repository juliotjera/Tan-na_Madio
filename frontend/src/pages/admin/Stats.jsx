// Statistiques globales (version d'origine) : période + export, 4 indicateurs,
// évolution des signalements, répartition par zone, performance des camions
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Download, TrendingUp, TriangleAlert, Truck, Users } from 'lucide-react'
import { statsCamions, statsPeriode, statsZones, tableauDeBord, telechargerCsv } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { CourbeEvolution } from '../../components/common/Graphiques'
import { Chargement, Chiffre, Erreur, Spinner } from '../../components/common/ui'
import { nombre } from '../../utils/format'

// période choisie → date de début
const PERIODES = {
  semaine: { libelle: 'Cette semaine', debut: () => new Date(Date.now() - 7 * 86400000) },
  mois: { libelle: 'Ce mois', debut: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  trimestre: { libelle: '3 derniers mois', debut: () => new Date(Date.now() - 90 * 86400000) },
  annee: { libelle: 'Cette année', debut: () => new Date(new Date().getFullYear(), 0, 1) },
}

export default function Stats() {
  const [periodeCle, setPeriodeCle] = useState('mois')
  const [export_, setExport] = useState(false)
  const debut = PERIODES[periodeCle].debut()
  const periode = useDonnees(() => statsPeriode({ debut: debut.toISOString(), fin: new Date().toISOString() }), [periodeCle])
  const stats = useDonnees(tableauDeBord, [])
  const zones = useDonnees(statsZones, [])
  const camions = useDonnees(statsCamions, [])
  const s = stats.donnees
  const maxZone = Math.max(1, ...(zones.donnees ?? []).map((z) => z.total_signalements))

  const exporter = async () => {
    setExport(true)
    try {
      const params = { debut: debut.toISOString(), fin: new Date().toISOString() }
      const a = await telechargerCsv('signalements', params)
      const b = await telechargerCsv('collectes', params)
      toast.success(`Exports enregistrés : ${a} et ${b}`)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setExport(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px]">Statistiques Globales</h1>
          <p className="mt-1 text-encre-doux">Analyse des performances du système</p>
        </div>
        <div className="flex gap-3">
          <select className="rounded-xl border-0 bg-slate-100 px-4 py-2.5 text-sm font-medium" value={periodeCle} onChange={(e) => setPeriodeCle(e.target.value)} aria-label="Période">
            {Object.entries(PERIODES).map(([k, p]) => (
              <option key={k} value={k}>
                {p.libelle}
              </option>
            ))}
          </select>
          <button type="button" className="btn-secondaire" onClick={exporter} disabled={export_}>
            {export_ ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />} Exporter
          </button>
        </div>
      </div>

      {stats.erreur && <Erreur message={stats.erreur} onReessayer={stats.recharger} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Chiffre ton="vert" icone={TriangleAlert} libelle="Signalements" valeur={s ? nombre(s.signalements) : '—'} />
        <Chiffre ton="vert" icone={Truck} libelle="Collectes" valeur={s ? nombre(s.collectes) : '—'} />
        <Chiffre ton="ambre" icone={Users} libelle="Utilisateurs" valeur={s ? nombre(s.utilisateurs) : '—'} />
        <Chiffre ton="bleu" icone={TrendingUp} libelle="Taux de réussite" valeur={s ? `${s.taux_reussite.toLocaleString('fr-FR')} %` : '—'} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="carte p-6">
          <h2 className="text-xl">Évolution des signalements</h2>
          <div className="mt-4 rounded-xl bg-fond/60 p-3">{periode.donnees ? <CourbeEvolution series={periode.donnees.series} hauteur={260} /> : <Chargement lignes={1} />}</div>
        </section>
        <section className="carte p-6">
          <h2 className="text-xl">Répartition par zone</h2>
          <ul className="mt-4 space-y-4">
            {zones.donnees?.map((z) => (
              <li key={z.id}>
                <div className="flex justify-between text-sm">
                  <span>{z.nom}</span>
                  <span className="font-semibold">{z.total_signalements}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fond">
                  <div className="h-full rounded-full bg-vert-500" style={{ width: `${(z.total_signalements / maxZone) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="carte p-6">
        <h2 className="text-xl">Performance des camions</h2>
        {camions.chargement && !camions.donnees && <Chargement lignes={2} />}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {camions.donnees?.map((c) => (
            <div key={c.id} className="flex items-start justify-between rounded-xl bg-fond/70 px-4 py-3.5">
              <div>
                <p className="font-medium">{c.immatriculation}</p>
                <p className="text-sm text-encre-doux">
                  {c.collectes} Collecte{c.collectes > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="chiffre text-lg text-vert">{c.efficacite_pct}%</p>
                <p className="text-xs text-encre-pale">efficacité</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-encre-pale">
          <CheckCircle2 className="h-3.5 w-3.5" /> Efficacité : part des points planifiés effectivement ramassés.
        </p>
      </section>
    </div>
  )
}

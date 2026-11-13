// Statistiques globales (version d'origine) : période + export, 4 indicateurs,
// évolution des signalements, répartition par zone, points noirs (carte), performance des camions
import { useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, Download, Flame, TrendingUp, TriangleAlert, Truck, Users } from 'lucide-react'
import { CircleMarker, Tooltip } from 'react-leaflet'
import { pointsNoirs, statsCamions, statsPeriode, statsZones, tableauDeBord, telechargerCsv } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { CourbeEvolution } from '../../components/common/Graphiques'
import { Cadrer, Carte } from '../../components/map/Carte'
import { Chargement, Chiffre, Erreur, Spinner } from '../../components/common/ui'
import { dateCourte, nombre } from '../../utils/format'
import { T } from '../../context/LangueContext'

// période choisie → date de début
const PERIODES = {
  semaine: { libelle: 'Cette semaine', jours: 7, debut: () => new Date(Date.now() - 7 * 86400000) },
  mois: { libelle: 'Ce mois', jours: 31, debut: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
  trimestre: { libelle: '3 derniers mois', jours: 90, debut: () => new Date(Date.now() - 90 * 86400000) },
  annee: { libelle: 'Cette année', jours: 365, debut: () => new Date(new Date().getFullYear(), 0, 1) },
}

export default function Stats() {
  const [periodeCle, setPeriodeCle] = useState('mois')
  const [export_, setExport] = useState(false)
  const debut = PERIODES[periodeCle].debut()
  const periode = useDonnees(() => statsPeriode({ debut: debut.toISOString(), fin: new Date().toISOString() }), [periodeCle])
  const stats = useDonnees(tableauDeBord, [])
  const zones = useDonnees(statsZones, [])
  const camions = useDonnees(statsCamions, [])
  const noirs = useDonnees(() => pointsNoirs(PERIODES[periodeCle].jours), [periodeCle])
  const maxNoir = Math.max(1, ...(noirs.donnees ?? []).map((p) => p.total))
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
          <p className="mt-1 text-encre-doux"><T>Analyse des performances du système</T></p>
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
          <h2 className="text-xl"><T>Évolution des signalements</T></h2>
          <div className="mt-4">{periode.donnees ? <CourbeEvolution series={periode.donnees.series} hauteur={260} /> : <Chargement lignes={1} />}</div>
        </section>
        <section className="carte p-6">
          <h2 className="text-xl"><T>Répartition par zone</T></h2>
          <ul className="mt-4 space-y-4">
            {zones.donnees?.map((z) => (
              <li key={z.id}>
                <div className="flex justify-between text-sm">
                  <span>{z.nom}</span>
                  <span className="font-semibold">{z.total_signalements}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fond">
                  <div className="h-full rounded-full bg-or" style={{ width: `${(z.total_signalements / maxZone) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="carte p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl">
              <Flame className="h-5 w-5 text-ambre" /> <T>Points noirs</T>
            </h2>
            <p className="text-sm text-encre-doux">Lieux où les dépôts reviennent (au moins 2 signalements dans un rayon d’environ 200 m)</p>
          </div>
        </div>
        {noirs.donnees?.length === 0 && <p className="mt-4 rounded-xl bg-fond/70 p-6 text-center text-sm text-encre-doux">Aucun lieu récurrent sur cette période.</p>}
        {noirs.donnees?.length > 0 && (
          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Carte className="h-[340px]" zoom={13}>
              {noirs.donnees.map((p, i) => (
                <CircleMarker
                  key={i}
                  center={[p.latitude, p.longitude]}
                  radius={8 + 18 * (p.total / maxNoir)}
                  pathOptions={{ color: p.ouverts ? '#B45309' : '#8A6A22', weight: 2, fillColor: p.ouverts ? '#F59E0B' : '#C9A55C', fillOpacity: 0.45 }}
                >
                  <Tooltip>
                    {p.zone_nom ?? 'Hors zone'} : {p.total} signalements, {p.ouverts} encore ouverts
                  </Tooltip>
                </CircleMarker>
              ))}
              <Cadrer points={noirs.donnees.map((p) => [p.latitude, p.longitude])} max={15} />
            </Carte>
            <ol className="space-y-2">
              {noirs.donnees.slice(0, 6).map((p, i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-fond/70 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ambre-50 text-sm font-bold text-ambre-700">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.zone_nom ?? 'Hors zone'}</p>
                    <p className="text-xs text-encre-pale">
                      {p.ouverts} ouvert{p.ouverts > 1 ? 's' : ''} · dernier le {dateCourte(p.dernier)}
                    </p>
                  </div>
                  <span className="chiffre text-lg text-ardoise">{p.total}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <section className="carte p-6">
        <h2 className="text-xl"><T>Performance des camions</T></h2>
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
                <p className="chiffre text-lg text-marque">{c.efficacite_pct}%</p>
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

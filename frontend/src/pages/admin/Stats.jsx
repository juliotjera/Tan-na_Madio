// Statistiques sur une période : évolution, zones, urgences, délais
import { useState } from 'react'
import { statsCamions, statsPeriode, statsZones } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import BoutonExport from '../../components/common/BoutonExport'
import { BarresZones, CourbeActivite, CourbeEvolution } from '../../components/common/Graphiques'
import { Chargement, EnTete, Erreur, Segments } from '../../components/common/ui'
import { kg, nombre, URGENCES } from '../../utils/format'

const PERIODES = [
  { valeur: 7, libelle: '7 jours' },
  { valeur: 30, libelle: '30 jours' },
  { valeur: 90, libelle: '3 mois' },
  { valeur: 365, libelle: '1 an' },
]

export default function Stats() {
  const [jours, setJours] = useState(30)
  const periode = useDonnees(() => {
    const fin = new Date()
    return statsPeriode({ debut: new Date(fin.getTime() - jours * 86400000).toISOString(), fin: fin.toISOString() })
  }, [jours])
  const zones = useDonnees(statsZones, [])
  const camions = useDonnees(statsCamions, [])
  const p = periode.donnees
  const totaux = p?.series.reduce((t, x) => ({ signalements: t.signalements + x.signalements, collectes: t.collectes + x.collectes, poids: t.poids + x.poids_kg }), { signalements: 0, collectes: 0, poids: 0 })
  const urgences = Object.keys(URGENCES).map((u) => ({ cle: u, total: p?.par_urgence.find((x) => x.urgence === u)?.total ?? 0 }))
  const maxUrgence = Math.max(1, ...urgences.map((u) => u.total))

  return (
    <div className="space-y-6">
      <EnTete titre="Statistiques" texte="L’activité sur la période choisie." actions={<Segments options={PERIODES} valeur={jours} onChange={setJours} libelle="Période" />} />
      <div className="-mt-2 flex flex-wrap gap-2">
        <BoutonExport ressource="signalements" params={{ debut: p?.debut, fin: p?.fin }} libelle="Signalements de la période (CSV)" />
        <BoutonExport ressource="collectes" params={{ debut: p?.debut, fin: p?.fin }} libelle="Tournées de la période (CSV)" />
      </div>
      {periode.erreur && <Erreur message={periode.erreur} onReessayer={periode.recharger} />}

      {totaux && (
        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ['Signalements reçus', nombre(totaux.signalements)],
            ['Dépôts ramassés', nombre(totaux.collectes)],
            ['Déchets collectés', kg(totaux.poids)],
          ].map(([k, v]) => (
            <div key={k} className="carte p-5">
              <dt className="text-sm text-encre-doux">{k}</dt>
              <dd className="chiffre mt-1 text-[30px] text-ardoise">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="carte p-5">
        <h2 className="text-lg font-semibold">Évolution</h2>
        <p className="text-sm text-encre-pale">{p?.pas === 'semaine' ? 'Semaine par semaine' : 'Jour par jour'}</p>
        <div className="mt-4">{p ? <CourbeEvolution series={p.series} hauteur={300} /> : <Chargement />}</div>
        {p && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold text-vert">Voir aussi les dépôts ramassés, jour par jour</summary>
            <div className="mt-3">
              <CourbeActivite series={p.series} hauteur={260} />
            </div>
          </details>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="carte p-5">
          <h2 className="text-lg font-semibold">Par zone</h2>
          <div className="mt-4">{zones.donnees ? <BarresZones zones={zones.donnees} /> : <Chargement />}</div>
          {zones.donnees && (
            <div className="mt-4 overflow-x-auto">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th className="text-right">Signalements</th>
                    <th className="text-right">Critiques</th>
                    <th className="text-right">Délai de validation</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.donnees.map((z) => (
                    <tr key={z.id}>
                      <td className="font-medium">{z.nom}</td>
                      <td className="text-right tabular-nums">{z.total_signalements}</td>
                      <td className="text-right tabular-nums">{z.urgents}</td>
                      <td className="text-right tabular-nums">{z.delai_moyen_heures != null ? `${z.delai_moyen_heures.toLocaleString('fr-FR')} h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="carte p-5">
          <h2 className="text-lg font-semibold">Niveaux d’urgence</h2>
          <p className="text-sm text-encre-pale">Signalements reçus sur la période</p>
          <ul className="mt-5 space-y-4">
            {urgences.map((u) => (
              <li key={u.cle}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{URGENCES[u.cle].libelle}</span>
                  <span className="tabular-nums text-encre-doux">{u.total}</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-vert-50">
                  <div className="h-full rounded-full" style={{ width: `${(u.total / maxUrgence) * 100}%`, background: URGENCES[u.cle].couleur }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="carte p-5">
        <h2 className="text-lg font-semibold">Performance des camions</h2>
        <p className="text-sm text-encre-pale">Efficacité : part des points planifiés effectivement ramassés</p>
        {camions.chargement && !camions.donnees && <Chargement lignes={2} />}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {camions.donnees?.map((c) => (
            <div key={c.id} className="rounded-xl bg-fond/70 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-titre text-lg font-bold">{c.immatriculation}</p>
                  <p className="text-sm text-encre-doux">
                    {c.collectes} collecte{c.collectes > 1 ? 's' : ''} · {c.points_collectes}/{c.points_planifies} points · {kg(c.kg)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`chiffre text-2xl ${c.efficacite_pct >= 75 ? 'text-vert-500' : c.efficacite_pct >= 40 ? 'text-ambre' : 'text-encre-pale'}`}>{c.efficacite_pct} %</p>
                  <p className="text-xs text-encre-pale">efficacité</p>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-vert-500" style={{ width: `${c.efficacite_pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

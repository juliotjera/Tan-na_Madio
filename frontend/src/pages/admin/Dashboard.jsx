// Administrateur : vue d'ensemble du service (5 indicateurs, activité des 30 derniers jours, zones)
import { Link } from 'react-router-dom'
import { Clock, Inbox, Percent, Scale, Users } from 'lucide-react'
import { statsPeriode, statsZones, tableauDeBord } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { BarresZones, CourbeActivite } from '../../components/common/Graphiques'
import { Chargement, Chiffre, EnTete, Erreur } from '../../components/common/ui'
import { kg, km, nombre } from '../../utils/format'

export default function AdminDashboard() {
  const stats = useDonnees(tableauDeBord, [], { intervalle: 60000 })
  const periode = useDonnees(() => statsPeriode(), [])
  const zones = useDonnees(statsZones, [])
  const s = stats.donnees

  return (
    <div className="space-y-6">
      <EnTete
        titre="Tableau de bord"
        texte="L’activité du service de collecte, mise à jour chaque minute."
        actions={
          <Link to="/admin/stats" className="btn-secondaire">
            Statistiques détaillées
          </Link>
        }
      />
      {stats.erreur && <Erreur message={stats.erreur} onReessayer={stats.recharger} />}
      {!s && stats.chargement && <Chargement />}
      {s && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          <Chiffre icone={Inbox} valeur={nombre(s.signalements)} libelle="Signalements" detail={`${s.en_attente} en attente de validation`} />
          <Chiffre icone={Percent} ton="nuit" valeur={`${s.taux_reussite.toLocaleString('fr-FR')} %`} libelle="Taux de ramassage" detail="Signalements retenus déjà collectés" />
          <Chiffre icone={Clock} ton="ambre" valeur={s.delai_moyen_heures != null ? `${s.delai_moyen_heures.toLocaleString('fr-FR')} h` : '—'} libelle="Délai de validation" detail="En moyenne" />
          <Chiffre icone={Scale} valeur={kg(s.poids_total_kg)} libelle="Déchets collectés" detail={`${km(s.distance_totale_km)} parcourus`} />
          <Chiffre icone={Users} valeur={nombre(s.utilisateurs)} libelle="Utilisateurs" detail={`${s.camions} camions, ${s.collectes} tournées`} />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="carte p-5">
          <h2 className="text-lg font-semibold">30 derniers jours</h2>
          <p className="text-sm text-encre-pale">Signalements reçus et dépôts ramassés, jour par jour</p>
          <div className="mt-4">{periode.donnees ? <CourbeActivite series={periode.donnees.series} /> : <Chargement />}</div>
        </section>
        <section className="carte p-5">
          <h2 className="text-lg font-semibold">Par zone</h2>
          <p className="text-sm text-encre-pale">Où arrivent les signalements, et où ils sont traités</p>
          <div className="mt-4">{zones.donnees ? <BarresZones zones={zones.donnees} /> : <Chargement />}</div>
        </section>
      </div>
    </div>
  )
}

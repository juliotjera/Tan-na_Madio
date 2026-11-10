// Mes tournées (version d'origine) : compteurs, filtres, tournées en cours puis historique
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Clock, MapPin, Route, Truck } from 'lucide-react'
import { listerCollectes } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { useLangue } from '../../context/LangueContext'
import { StatutBadge } from '../../components/common/Badge'
import { Chargement, Compteur, EnTete, Erreur, Segments, Vide } from '../../components/common/ui'
import { jourHeure, km } from '../../utils/format'

const FILTRES = [
  { valeur: '', libelle: 'Toutes' },
  { valeur: 'planifiee', libelle: 'Planifiées' },
  { valeur: 'en_cours', libelle: 'En cours' },
  { valeur: 'terminee', libelle: 'Terminées' },
]

function Ligne({ c }) {
  const { t } = useLangue()
  return (
    <li className="carte flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {t('Collecte du')} {jourHeure(c.date_planifiee)} <StatutBadge statut={c.statut} type="collecte" />
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-encre-doux sm:grid-cols-4">
          <span className="flex items-center gap-1.5">
            <Truck className="h-4 w-4" /> {c.camion_immatriculation}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> {c.zone_nom ?? t('Plusieurs zones')}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {c.nb_faits}/{c.nb_points} {t('signalements')}
          </span>
          <span className="flex items-center gap-1.5">
            <Route className="h-4 w-4" /> {km(c.distance_km)}
          </span>
        </div>
      </div>
      <Link to={`/chauffeur/tournees/${c.id}`} className="btn-secondaire shrink-0">
        {t('Voir détails')} <ChevronRight className="h-4 w-4" />
      </Link>
    </li>
  )
}

export default function MesTournees() {
  const { t } = useLangue()
  const [statut, setStatut] = useState('')
  const liste = useDonnees(() => listerCollectes({ limit: 100 }), [], { intervalle: 30000 })
  const toutes = liste.donnees?.collectes ?? []
  const filtrees = statut ? toutes.filter((c) => c.statut === statut) : toutes
  const actives = filtrees.filter((c) => c.statut === 'en_cours' || c.statut === 'planifiee')
  const historique = filtrees.filter((c) => c.statut === 'terminee' || c.statut === 'annulee')
  const n = (s) => toutes.filter((c) => c.statut === s).length

  return (
    <div>
      <EnTete titre={t('Mes tournées')} texte={t('Filtrez, démarrez et suivez vos collectes.')} />
      <div className="grid grid-cols-3 gap-4">
        <Compteur valeur={n('planifiee')} libelle={t('Planifiées')} couleur="ambre" />
        <Compteur valeur={n('en_cours')} libelle={t('En cours')} couleur="bleu" />
        <Compteur valeur={n('terminee')} libelle={t('Terminées')} couleur="vert" />
      </div>
      <div className="mt-5">
        <Segments options={FILTRES.map((f) => ({ ...f, libelle: t(f.libelle) }))} valeur={statut} onChange={setStatut} libelle={t('Statut')} />
      </div>

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}
      {liste.donnees && filtrees.length === 0 && (
        <div className="carte mt-5">
          <Vide icone={Route} titre={t('Aucune tournée')} texte={t('Les tournées planifiées par les agents municipaux apparaîtront ici.')} />
        </div>
      )}

      {actives.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg">{t('Tournées en cours et à venir')}</h2>
          <ul className="space-y-3">
            {actives.map((c) => (
              <Ligne key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}
      {historique.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg">{t('Historique des tournées')}</h2>
          <ul className="space-y-3">
            {historique.map((c) => (
              <Ligne key={c.id} c={c} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

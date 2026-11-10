// Agent : état de la flotte (la gestion est réservée à l'administrateur)
import { Truck, UserRound, Wrench } from 'lucide-react'
import { listerCamions } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { StatutBadge } from '../../components/common/Badge'
import { Chargement, EnTete, Erreur, Vide } from '../../components/common/ui'
import { dateCourte, kg } from '../../utils/format'

export default function Camions() {
  const camions = useDonnees(() => listerCamions(), [], { intervalle: 30000 })
  return (
    <div>
      <EnTete titre="Camions" texte="Disponibilité de la flotte pour planifier les tournées." />
      {camions.erreur && <Erreur message={camions.erreur} onReessayer={camions.recharger} />}
      {camions.chargement && !camions.donnees && <Chargement />}
      {camions.donnees?.length === 0 && (
        <div className="carte">
          <Vide icone={Truck} titre="Aucun camion enregistré" texte="L’administrateur ajoute les camions de la commune." />
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {camions.donnees?.map((c) => (
          <li key={c.id} className="carte p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-titre text-xl font-semibold text-foret">{c.immatriculation}</p>
                <p className="text-sm text-encre-doux">{c.modele ?? 'Modèle non renseigné'}</p>
              </div>
              <StatutBadge statut={c.statut} type="camion" />
            </div>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-encre-pale" />
                <dt className="sr-only">Capacité</dt>
                <dd>{kg(c.capacite_kg)} de capacité</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <UserRound className="h-4 w-4 text-encre-pale" />
                <dt className="sr-only">Chauffeur</dt>
                <dd>{c.chauffeur_nom ?? <span className="text-ambre-700">Aucun chauffeur affecté</span>}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4 w-4 text-encre-pale" />
                <dt className="sr-only">Maintenance</dt>
                <dd>Entretien : {dateCourte(c.derniere_maintenance)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Gestion de la flotte : ajout, modification, affectation du chauffeur, suppression
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { creerCamion, listerCamions, listerUtilisateurs, modifierCamion, supprimerCamion } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useDonnees } from '../../hooks/useDonnees'
import { StatutBadge } from '../../components/common/Badge'
import { Champ, Chargement, Confirmation, Erreur, Modal, Spinner, Vide } from '../../components/common/ui'
import { STATUTS_CAMION } from '../../utils/format'
import { T } from '../../context/LangueContext'

const VIDE = { immatriculation: '', modele: '', capacite_kg: '', statut: 'disponible', chauffeur_id: '', derniere_maintenance: '' }

function FormulaireCamion({ camion, ouvert, onFermer, onEnregistre }) {
  const [f, setF] = useState(VIDE)
  const [envoi, setEnvoi] = useState(false)
  const chauffeurs = useDonnees(() => (ouvert ? listerUtilisateurs({ role: 'chauffeur', limit: 100 }) : null), [ouvert])
  useEffect(() => {
    if (!ouvert) return
    setF(
      camion
        ? {
            immatriculation: camion.immatriculation,
            modele: camion.modele ?? '',
            capacite_kg: String(camion.capacite_kg),
            statut: camion.statut,
            chauffeur_id: camion.chauffeur_id ?? '',
            derniere_maintenance: camion.derniere_maintenance?.slice(0, 10) ?? '',
          }
        : VIDE,
    )
  }, [ouvert, camion])
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    const champs = {
      immatriculation: f.immatriculation,
      modele: f.modele || null,
      capacite_kg: Number(f.capacite_kg),
      chauffeur_id: f.chauffeur_id || null,
      derniere_maintenance: f.derniere_maintenance || null,
    }
    if (camion && f.statut !== camion.statut) champs.statut = f.statut
    try {
      const c = camion ? await modifierCamion(camion.id, champs) : await creerCamion(champs)
      toast.success(camion ? `Camion ${c.immatriculation} modifié` : `Camion ${c.immatriculation} ajouté`)
      onEnregistre()
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  const enTournee = camion?.statut === 'en_tournee'
  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={camion ? `Modifier ${camion.immatriculation}` : 'Ajouter un camion'}
      pied={
        <>
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            <T>Annuler</T>
          </button>
          <button type="submit" form="camion" className="btn-principal" disabled={envoi}>
            {envoi && <Spinner className="h-4 w-4 text-white" />}
            <T>Enregistrer</T>
          </button>
        </>
      }
    >
      <form id="camion" onSubmit={soumettre} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Immatriculation">{(id) => <input id={id} className="champ uppercase" value={f.immatriculation} onChange={maj('immatriculation')} required />}</Champ>
          <Champ libelle="Modèle">{(id) => <input id={id} className="champ" value={f.modele} onChange={maj('modele')} placeholder="Renault Maxity" />}</Champ>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Capacité (kg)">{(id) => <input id={id} type="number" min="1" className="champ" value={f.capacite_kg} onChange={maj('capacite_kg')} required />}</Champ>
          <Champ libelle="Dernier entretien" aide="Facultatif">
            {(id) => <input id={id} type="date" className="champ" value={f.derniere_maintenance} onChange={maj('derniere_maintenance')} />}
          </Champ>
        </div>
        <Champ libelle="Chauffeur" aide="Un chauffeur conduit un seul camion : l’affecter ici le retire de son ancien camion.">
          {(id) => (
            <select id={id} className="champ" value={f.chauffeur_id} onChange={maj('chauffeur_id')}>
              <option value="">Aucun chauffeur</option>
              {chauffeurs.donnees?.utilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </select>
          )}
        </Champ>
        {camion && (
          <Champ libelle="État" aide={enTournee ? 'En tournée : l’état changera à la fin de la tournée.' : '« En tournée » est réglé automatiquement par les collectes.'}>
            {(id) => (
              <select id={id} className="champ" value={f.statut} onChange={maj('statut')} disabled={enTournee}>
                {Object.entries(STATUTS_CAMION)
                  .filter(([v]) => v !== 'en_tournee' || enTournee)
                  .map(([v, s]) => (
                    <option key={v} value={v}>
                      {s.libelle}
                    </option>
                  ))}
              </select>
            )}
          </Champ>
        )}
      </form>
    </Modal>
  )
}

export default function GestionCamions() {
  const camions = useDonnees(() => listerCamions(), [])
  const [edition, setEdition] = useState(null) // null fermé, {} nouveau, camion
  const [aSupprimer, setASupprimer] = useState(null)
  const [suppression, setSuppression] = useState(false)

  const supprimer = async () => {
    setSuppression(true)
    try {
      await supprimerCamion(aSupprimer.id)
      toast.success(`Camion ${aSupprimer.immatriculation} supprimé`)
      setASupprimer(null)
      camions.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setSuppression(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[28px]">Gestion des Camions</h1>
          <p className="mt-1 text-encre-doux">Gérez la flotte de collecte</p>
        </div>
        <button type="button" className="btn-principal px-5" onClick={() => setEdition({})}>
          <Plus className="h-5 w-5" /> <T>Ajouter un camion</T>
        </button>
      </div>
      {camions.erreur && <Erreur message={camions.erreur} onReessayer={camions.recharger} />}
      {camions.chargement && !camions.donnees && <Chargement />}
      {camions.donnees?.length === 0 && (
        <div className="carte">
          <Vide icone={Truck} titre="Aucun camion" texte="Ajoutez les camions de la commune pour planifier des tournées." />
        </div>
      )}
      {camions.donnees?.length > 0 && (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[760px]">
            <thead>
              <tr>
                <th><T>Immatriculation</T></th>
                <th><T>Modèle</T></th>
                <th><T>Capacité (kg)</T></th>
                <th><T>Statut</T></th>
                <th><T>Chauffeur</T></th>
                <th><T>Actions</T></th>
              </tr>
            </thead>
            <tbody>
              {camions.donnees.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold text-ardoise">{c.immatriculation}</td>
                  <td className="text-encre-doux">{c.modele ?? '-'}</td>
                  <td className="tabular-nums text-encre-doux">{c.capacite_kg.toFixed(2)}</td>
                  <td>
                    <StatutBadge statut={c.statut} type="camion" />
                  </td>
                  <td className="text-encre-doux">{c.chauffeur_nom ?? '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button type="button" className="btn-discret min-h-[34px] px-2" onClick={() => setEdition(c)} aria-label={`Modifier ${c.immatriculation}`} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="btn min-h-[34px] px-2 text-alerte hover:bg-alerte-50"
                        onClick={() => setASupprimer(c)}
                        disabled={c.statut === 'en_tournee'}
                        aria-label={`Supprimer ${c.immatriculation}`}
                        title={c.statut === 'en_tournee' ? 'Impossible pendant une tournée' : 'Supprimer'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FormulaireCamion
        ouvert={edition !== null}
        camion={edition?.id ? edition : null}
        onFermer={() => setEdition(null)}
        onEnregistre={() => {
          setEdition(null)
          camions.recharger({ silencieux: true })
        }}
      />
      <Confirmation
        ouvert={Boolean(aSupprimer)}
        onFermer={() => setASupprimer(null)}
        onConfirmer={supprimer}
        enCours={suppression}
        danger
        titre={`Supprimer ${aSupprimer?.immatriculation ?? ''} ?`}
        texte="Un camion qui a déjà fait des tournées est conservé pour l’historique : passez-le plutôt « hors service »."
        action="Supprimer"
      />
    </div>
  )
}

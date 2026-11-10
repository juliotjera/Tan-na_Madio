// Gestion des comptes : recherche, filtre par rôle, création du personnel, activation
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Search, UserPlus } from 'lucide-react'
import { activerUtilisateur, creerUtilisateur, listerCamions, listerUtilisateurs, listerZones } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { Champ, Chargement, EnTete, Erreur, Modal, Pagination, Segments, Spinner } from '../../components/common/ui'
import { dateCourte, ROLES } from '../../utils/format'

const FILTRES = [{ valeur: '', libelle: 'Tous' }, ...Object.entries(ROLES).map(([valeur, libelle]) => ({ valeur, libelle: `${libelle}s` }))]
const VIDE = { prenom: '', nom: '', email: '', telephone: '', role: 'agent_municipal', mot_de_passe: '', matricule: '', zone_id: '', numero_permis: '', camion_id: '' }

function FormulaireCompte({ ouvert, onFermer, onCree }) {
  const [f, setF] = useState(VIDE)
  const [envoi, setEnvoi] = useState(false)
  const zones = useDonnees(() => (ouvert ? listerZones() : []), [ouvert])
  const camions = useDonnees(() => (ouvert ? listerCamions() : []), [ouvert])
  useEffect(() => {
    if (ouvert) setF(VIDE)
  }, [ouvert])
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    try {
      const extras =
        f.role === 'agent_municipal'
          ? { matricule: f.matricule, zone_id: f.zone_id || null }
          : f.role === 'chauffeur'
            ? { numero_permis: f.numero_permis, camion_id: f.camion_id || null }
            : f.role === 'administrateur'
              ? { niveau: 1 }
              : {}
      const u = await creerUtilisateur({ prenom: f.prenom, nom: f.nom, email: f.email, telephone: f.telephone || null, role: f.role, mot_de_passe: f.mot_de_passe, extras })
      toast.success(`Compte créé pour ${u.prenom} ${u.nom}`)
      onCree()
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Nouveau compte"
      pied={
        <>
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            Annuler
          </button>
          <button type="submit" form="nouveau-compte" className="btn-principal" disabled={envoi}>
            {envoi && <Spinner className="h-4 w-4 text-white" />}
            Créer le compte
          </button>
        </>
      }
    >
      <form id="nouveau-compte" onSubmit={soumettre} className="space-y-4">
        <Champ libelle="Rôle">
          {(id) => (
            <select id={id} className="champ" value={f.role} onChange={maj('role')}>
              {Object.entries(ROLES).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          )}
        </Champ>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Prénom">{(id) => <input id={id} className="champ" value={f.prenom} onChange={maj('prenom')} required />}</Champ>
          <Champ libelle="Nom">{(id) => <input id={id} className="champ" value={f.nom} onChange={maj('nom')} required />}</Champ>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Adresse e-mail">{(id) => <input id={id} type="email" className="champ" value={f.email} onChange={maj('email')} required />}</Champ>
          <Champ libelle="Téléphone" aide="Facultatif">
            {(id) => <input id={id} type="tel" className="champ" value={f.telephone} onChange={maj('telephone')} />}
          </Champ>
        </div>
        {f.role === 'agent_municipal' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Matricule">{(id) => <input id={id} className="champ" value={f.matricule} onChange={maj('matricule')} required placeholder="CUA-AG-003" />}</Champ>
            <Champ libelle="Zone" aide="Facultatif">
              {(id) => (
                <select id={id} className="champ" value={f.zone_id} onChange={maj('zone_id')}>
                  <option value="">Aucune</option>
                  {zones.donnees?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nom}
                    </option>
                  ))}
                </select>
              )}
            </Champ>
          </div>
        )}
        {f.role === 'chauffeur' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Numéro de permis">{(id) => <input id={id} className="champ" value={f.numero_permis} onChange={maj('numero_permis')} required />}</Champ>
            <Champ libelle="Camion" aide="Affectation modifiable ensuite">
              {(id) => (
                <select id={id} className="champ" value={f.camion_id} onChange={maj('camion_id')}>
                  <option value="">Aucun</option>
                  {camions.donnees?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.immatriculation}
                      {c.chauffeur_nom ? ` (actuellement ${c.chauffeur_nom})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Champ>
          </div>
        )}
        <Champ libelle="Mot de passe provisoire" aide="8 caractères minimum, dont une lettre et un chiffre. À transmettre à la personne, qui le changera.">
          {(id) => <input id={id} type="text" className="champ font-mono" value={f.mot_de_passe} onChange={maj('mot_de_passe')} required autoComplete="off" />}
        </Champ>
      </form>
    </Modal>
  )
}

export default function Utilisateurs() {
  const { user: moi } = useAuth()
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(1)
  const [creation, setCreation] = useState(false)
  const [bascule, setBascule] = useState(null)
  const liste = useDonnees(() => listerUtilisateurs({ role: role || undefined, q: recherche || undefined, page, limit: 15 }), [role, recherche, page])

  // recherche lancée après une courte pause de frappe
  useEffect(() => {
    const t = setTimeout(() => {
      setRecherche(q.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const activer = async (u) => {
    setBascule(u.id)
    try {
      await activerUtilisateur(u.id, !u.actif)
      toast.success(u.actif ? `${u.prenom} ${u.nom} ne peut plus se connecter` : `Compte de ${u.prenom} ${u.nom} réactivé`)
      liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setBascule(null)
    }
  }

  return (
    <div>
      <EnTete
        titre="Utilisateurs"
        texte="Les citoyens s’inscrivent eux-mêmes ; les agents, chauffeurs et administrateurs sont créés ici."
        actions={
          <button type="button" className="btn-principal" onClick={() => setCreation(true)}>
            <UserPlus className="h-4 w-4" /> Nouveau compte
          </button>
        }
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="overflow-x-auto">
          <Segments
            options={FILTRES}
            valeur={role}
            onChange={(v) => {
              setRole(v)
              setPage(1)
            }}
            libelle="Rôle"
          />
        </div>
        <label className="relative lg:ml-auto lg:w-72">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-encre-pale" />
          <input type="search" className="champ pl-9" placeholder="Nom ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {liste.erreur && <Erreur message={liste.erreur} onReessayer={liste.recharger} />}
      {liste.chargement && !liste.donnees && <Chargement />}
      {liste.donnees && (
        <div className="carte overflow-x-auto">
          <table className="tableau min-w-[760px]">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Détail</th>
                <th>Inscrit le</th>
                <th className="text-right">Accès</th>
              </tr>
            </thead>
            <tbody>
              {liste.donnees.utilisateurs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-encre-doux">
                    Aucun compte ne correspond.
                  </td>
                </tr>
              )}
              {liste.donnees.utilisateurs.map((u) => (
                <tr key={u.id} className={u.actif ? '' : 'opacity-60'}>
                  <td>
                    <p className="font-medium">
                      {u.prenom} {u.nom}
                    </p>
                    <p className="text-xs text-encre-pale">{u.email}</p>
                  </td>
                  <td>{ROLES[u.role]}</td>
                  <td className="text-encre-doux">
                    {u.role === 'citoyen' && `${u.points_eco ?? 0} points éco`}
                    {u.role === 'agent_municipal' && u.matricule}
                    {u.role === 'chauffeur' && `Permis ${u.numero_permis}`}
                  </td>
                  <td className="text-encre-doux">{dateCourte(u.created_at)}</td>
                  <td className="text-right">
                    {u.id === moi.id ? (
                      <span className="text-xs text-encre-pale">Vous</span>
                    ) : (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={u.actif}
                        aria-label={`${u.actif ? 'Désactiver' : 'Activer'} le compte de ${u.prenom} ${u.nom}`}
                        disabled={bascule === u.id}
                        onClick={() => activer(u)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${u.actif ? 'bg-bleu-500' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${u.actif ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={15} onChange={setPage} />}

      <FormulaireCompte
        ouvert={creation}
        onFermer={() => setCreation(false)}
        onCree={() => {
          setCreation(false)
          liste.recharger({ silencieux: true })
        }}
      />
    </div>
  )
}

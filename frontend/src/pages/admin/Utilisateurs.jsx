// Gestion des utilisateurs (version d'origine) : compteurs, tableau Nom / Email / Rôle / Statut / Actions
// (activer ou désactiver, modifier, supprimer), création du personnel
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Copy, KeyRound, Pencil, Plus, Search, Shield, ShieldOff, Trash2 } from 'lucide-react'
import { activerUtilisateur, creerUtilisateur, listerCamions, listerUtilisateurs, listerZones, modifierUtilisateur, reinitialiserMotDePasse, supprimerUtilisateur } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { useAuth } from '../../hooks/useAuth'
import { useDonnees } from '../../hooks/useDonnees'
import { Champ, Chargement, Compteur, Confirmation, EnTete, Erreur, Modal, Pagination, Segments, Spinner } from '../../components/common/ui'
import { ROLES } from '../../utils/format'
import { T } from '../../context/LangueContext'

const FILTRES = [{ valeur: '', libelle: 'Tous' }, ...Object.entries(ROLES).map(([valeur, libelle]) => ({ valeur, libelle: `${libelle}s` }))]
// couleur de la puce de rôle, comme dans la version d'origine
// le rouge reste réservé à l'urgence critique : les rôles prennent la palette forêt et or
const PUCE_ROLE = {
  administrateur: 'bg-sombre text-or-clair',
  citoyen: 'bg-or-50 text-marque-700',
  agent_municipal: 'bg-or-50 text-or-700 ring-1 ring-or/30',
  chauffeur: 'bg-fond text-ardoise ring-1 ring-trait',
}
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
            <T>Annuler</T>
          </button>
          <button type="submit" form="nouveau-compte" className="btn-principal" disabled={envoi}>
            {envoi && <Spinner className="h-4 w-4 text-white" />}
            <T>Créer le compte</T>
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

function FormulaireModification({ compte, onFermer, onModifie }) {
  const [f, setF] = useState({ prenom: '', nom: '', telephone: '', zone_id: '' })
  const [envoi, setEnvoi] = useState(false)
  const zones = useDonnees(() => (compte?.role === 'agent_municipal' ? listerZones() : []), [compte?.id])
  useEffect(() => {
    if (compte) setF({ prenom: compte.prenom, nom: compte.nom, telephone: compte.telephone ?? '', zone_id: compte.zone_id ?? '' })
  }, [compte])
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    try {
      const champs = { prenom: f.prenom.trim(), nom: f.nom.trim(), telephone: f.telephone.trim() || null }
      if (compte.role === 'agent_municipal') champs.zone_id = f.zone_id || null
      await modifierUtilisateur(compte.id, champs)
      toast.success('Compte modifié')
      onModifie()
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modal
      ouvert={Boolean(compte)}
      onFermer={onFermer}
      titre="Modifier l’utilisateur"
      pied={
        <>
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            <T>Annuler</T>
          </button>
          <button type="submit" form="modifier-compte" className="btn-principal" disabled={envoi}>
            {envoi && <Spinner className="h-4 w-4 text-white" />}
            <T>Enregistrer</T>
          </button>
        </>
      }
    >
      {compte && (
        <form id="modifier-compte" onSubmit={soumettre} className="space-y-4">
          <p className="text-sm text-encre-doux">
            {compte.email} · {ROLES[compte.role]}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Prénom">{(id) => <input id={id} className="champ" value={f.prenom} onChange={maj('prenom')} required />}</Champ>
            <Champ libelle="Nom">{(id) => <input id={id} className="champ" value={f.nom} onChange={maj('nom')} required />}</Champ>
          </div>
          <Champ libelle="Téléphone" aide="Facultatif">
            {(id) => <input id={id} type="tel" className="champ" value={f.telephone} onChange={maj('telephone')} />}
          </Champ>
          {compte.role === 'agent_municipal' && (
            <Champ libelle="Zone">
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
          )}
        </form>
      )}
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
  const [edition, setEdition] = useState(null)
  const [suppression, setSuppression] = useState(null)
  const [suppr, setSuppr] = useState(false)
  const [aReinit, setAReinit] = useState(null)
  const [reinit, setReinit] = useState(false)
  const [provisoire, setProvisoire] = useState(null) // { nom, mot_de_passe } affiché une seule fois
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

  const reinitialiser = async () => {
    setReinit(true)
    try {
      const { mot_de_passe } = await reinitialiserMotDePasse(aReinit.id)
      setProvisoire({ nom: `${aReinit.prenom} ${aReinit.nom}`, email: aReinit.email, mot_de_passe })
      setAReinit(null)
      liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setReinit(false)
    }
  }

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(provisoire.mot_de_passe)
      toast.success('Mot de passe copié')
    } catch {
      toast.error('Copie impossible : sélectionnez le texte à la main')
    }
  }

  const supprimer = async () => {
    setSuppr(true)
    try {
      await supprimerUtilisateur(suppression.id)
      toast.success(`Compte de ${suppression.prenom} ${suppression.nom} supprimé`)
      setSuppression(null)
      liste.recharger({ silencieux: true })
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setSuppr(false)
    }
  }

  return (
    <div>
      <EnTete
        titre="Gestion des Utilisateurs"
        texte="Gérez les comptes et les accès"
        actions={
          <button type="button" className="btn-principal" onClick={() => setCreation(true)}>
            <Plus className="h-4 w-4" /> <T>Ajouter un utilisateur</T>
          </button>
        }
      />
      {liste.donnees?.compteurs && (
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Compteur valeur={liste.donnees.compteurs.total} libelle="Total" couleur="vert" />
          <Compteur valeur={liste.donnees.compteurs.actifs} libelle="Actifs" couleur="vert" />
          <Compteur valeur={liste.donnees.compteurs.agents} libelle="Agents" couleur="bleu" />
          <Compteur valeur={liste.donnees.compteurs.chauffeurs} libelle="Chauffeurs" couleur="violet" />
        </div>
      )}
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
                <th><T>Nom</T></th>
                <th><T>Email</T></th>
                <th><T>Rôle</T></th>
                <th><T>Statut</T></th>
                <th><T>Actions</T></th>
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
              {liste.donnees.utilisateurs.map((u) => {
                const soiMeme = u.id === moi.id
                const nomComplet = `${u.prenom} ${u.nom}`
                return (
                  <tr key={u.id}>
                    <td className="font-medium">
                      {nomComplet}
                      {soiMeme && <span className="ml-2 text-xs font-normal text-encre-pale">(vous)</span>}
                    </td>
                    <td className="text-encre-doux">{u.email}</td>
                    <td>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${PUCE_ROLE[u.role]}`}>{ROLES[u.role]}</span>
                    </td>
                    <td>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${u.actif ? 'bg-or-50 text-marque-700' : 'bg-slate-100 text-slate-500'}`}>{u.actif ? 'Actif' : 'Inactif'}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-encre-doux transition hover:bg-fond hover:text-encre disabled:opacity-40"
                          disabled={soiMeme || bascule === u.id}
                          onClick={() => activer(u)}
                          title={u.actif ? 'Désactiver le compte' : 'Activer le compte'}
                          aria-label={`${u.actif ? 'Désactiver' : 'Activer'} le compte de ${nomComplet}`}
                        >
                          {bascule === u.id ? <Spinner className="h-4 w-4" /> : u.actif ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-encre-doux transition hover:bg-fond hover:text-encre"
                          onClick={() => setEdition(u)}
                          title="Modifier"
                          aria-label={`Modifier le compte de ${nomComplet}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-encre-doux transition hover:bg-fond hover:text-encre disabled:opacity-40"
                          disabled={soiMeme}
                          onClick={() => setAReinit(u)}
                          title="Réinitialiser le mot de passe"
                          aria-label={`Réinitialiser le mot de passe de ${nomComplet}`}
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-alerte transition hover:bg-red-50 disabled:opacity-40"
                          disabled={soiMeme}
                          onClick={() => setSuppression(u)}
                          title="Supprimer"
                          aria-label={`Supprimer le compte de ${nomComplet}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {liste.donnees && <Pagination page={page} total={liste.donnees.total} limit={15} onChange={setPage} />}

      <FormulaireModification
        compte={edition}
        onFermer={() => setEdition(null)}
        onModifie={() => {
          setEdition(null)
          liste.recharger({ silencieux: true })
        }}
      />

      <Modal
        ouvert={Boolean(suppression)}
        onFermer={() => setSuppression(null)}
        titre="Supprimer l’utilisateur"
        pied={
          <>
            <button type="button" className="btn-secondaire" onClick={() => setSuppression(null)}>
              <T>Annuler</T>
            </button>
            <button type="button" className="btn-principal bg-alerte hover:bg-red-700" disabled={suppr} onClick={supprimer}>
              {suppr && <Spinner className="h-4 w-4 text-white" />}
              <T>Supprimer</T>
            </button>
          </>
        }
      >
        {suppression && (
          <p className="text-encre-doux">
            Supprimer définitivement le compte de{' '}
            <strong className="text-encre">
              {suppression.prenom} {suppression.nom}
            </strong>{' '}
            ? Un compte qui a déjà des signalements ou des tournées ne peut pas être supprimé : désactivez-le plutôt.
          </p>
        )}
      </Modal>

      <Confirmation
        ouvert={Boolean(aReinit)}
        onFermer={() => setAReinit(null)}
        onConfirmer={reinitialiser}
        enCours={reinit}
        titre={`Réinitialiser le mot de passe de ${aReinit?.prenom ?? ''} ${aReinit?.nom ?? ''} ?`}
        texte="Un mot de passe provisoire sera créé et affiché une seule fois. Ses sessions ouvertes seront fermées et la personne devra choisir son propre mot de passe à la prochaine connexion."
        action="Réinitialiser"
      />

      <Modal ouvert={Boolean(provisoire)} onFermer={() => setProvisoire(null)} titre="Mot de passe provisoire" pied={<button type="button" className="btn-principal" onClick={() => setProvisoire(null)}>J’ai transmis le mot de passe</button>}>
        {provisoire && (
          <div className="space-y-4">
            <p className="text-encre-doux">
              Transmettez ce mot de passe à <strong className="text-ardoise">{provisoire.nom}</strong> ({provisoire.email}). Il ne sera plus affiché ensuite.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-or-300 bg-or-50 p-3">
              <code className="flex-1 select-all text-center font-mono text-xl font-semibold tracking-wider text-ardoise">{provisoire.mot_de_passe}</code>
              <button type="button" className="btn-secondaire min-h-[38px]" onClick={copier}>
                <Copy className="h-4 w-4" /> <T>Copier</T>
              </button>
            </div>
          </div>
        )}
      </Modal>

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

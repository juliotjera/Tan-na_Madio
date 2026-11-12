// Mon compte : informations, changement de mot de passe, déconnexion
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LogOut } from 'lucide-react'
import { changerMotDePasse, profil } from '../api'
import { messageErreur } from '../api/axiosConfig'
import { useAuth } from '../hooks/useAuth'
import { useDonnees } from '../hooks/useDonnees'
import { Champ, Chargement, EnTete, Spinner } from '../components/common/ui'
import { CartePoints } from './citoyen/Dashboard'
import { dateCourte, ROLES } from '../utils/format'
import InterrupteurPush from '../components/common/InterrupteurPush'

export default function Compte() {
  const { user: moiSession, deconnecter, majUser } = useAuth()
  const navigate = useNavigate()
  const moi = useDonnees(profil, [])
  const [ancien, setAncien] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const u = moi.donnees

  const changer = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    try {
      await changerMotDePasse(ancien, nouveau)
      toast.success('Mot de passe modifié')
      majUser({ mdp_provisoire: false })
      setAncien('')
      setNouveau('')
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnvoi(false)
    }
  }

  if (!u) return <Chargement />
  const lignes = [
    ['Nom', `${u.prenom} ${u.nom}`],
    ['Adresse e-mail', u.email],
    ['Téléphone', u.telephone ?? '—'],
    ['Rôle', ROLES[u.role]],
    u.quartier && ['Quartier', u.quartier],
    u.matricule && ['Matricule', u.matricule],
    u.zone_nom && ['Zone', u.zone_nom],
    u.numero_permis && ['Permis', u.numero_permis],
    u.role === 'chauffeur' && ['Camion', u.camion_immatriculation ?? 'Non affecté'],
    ['Inscrit le', dateCourte(u.created_at)],
  ].filter(Boolean)

  return (
    <div className="max-w-3xl">
      <EnTete titre="Mon compte" />
      <div className="grid gap-6 md:grid-cols-2">
        <section className="carte p-5">
          <h2 className="text-lg font-semibold">Informations</h2>
          <dl className="mt-3 divide-y divide-trait">
            {lignes.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-encre-doux">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <div className="space-y-6">
          {u.role === 'citoyen' && <CartePoints points={u.points_eco ?? 0} />}
          <InterrupteurPush />
          <form onSubmit={changer} className="carte space-y-4 p-5">
            <h2 className="text-lg font-semibold">Changer de mot de passe</h2>
            {moiSession?.mdp_provisoire && (
              <p className="rounded-xl bg-ambre-50 px-4 py-3 text-sm text-ambre-700">Votre mot de passe actuel est provisoire (donné par l’administrateur). Saisissez-le, puis choisissez le vôtre.</p>
            )}
            <Champ libelle="Mot de passe actuel">
              {(id) => <input id={id} type="password" className="champ" autoComplete="current-password" value={ancien} onChange={(e) => setAncien(e.target.value)} required />}
            </Champ>
            <Champ libelle="Nouveau mot de passe" aide="8 caractères minimum, dont une lettre et un chiffre. Vos autres appareils seront déconnectés.">
              {(id) => <input id={id} type="password" className="champ" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} required />}
            </Champ>
            <button type="submit" className="btn-principal w-full" disabled={envoi || !ancien || nouveau.length < 8}>
              {envoi && <Spinner className="h-4 w-4 text-white" />}
              Modifier le mot de passe
            </button>
          </form>
          <button
            type="button"
            className="btn-secondaire w-full"
            onClick={async () => {
              await deconnecter()
              navigate('/login', { replace: true })
            }}
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

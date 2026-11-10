// Inscription publique : comptes citoyens uniquement (le personnel est créé par l'administrateur)
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { ACCUEIL_PAR_ROLE } from '../../context/AuthContext'
import { messageErreur } from '../../api/axiosConfig'
import { Champ, Spinner } from '../../components/common/ui'
import CadreAuth from './CadreAuth'

const QUARTIERS = ['Analakely', 'Isotry', 'Ampefiloha', 'Ambohipo', 'Andravoahangy', 'Autre quartier']

export default function Register() {
  const { inscrire, connecte, user } = useAuth()
  const navigate = useNavigate()
  const [f, setF] = useState({ prenom: '', nom: '', email: '', telephone: '', quartier: '', mot_de_passe: '' })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })

  if (connecte && !envoi) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const mdpOk = f.mot_de_passe.length >= 8 && /\d/.test(f.mot_de_passe) && /[A-Za-z]/.test(f.mot_de_passe)

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const { quartier, ...reste } = f
      await inscrire({ ...reste, extras: { quartier: quartier || null } })
      toast.success('Compte créé. Bienvenue !')
      navigate('/citoyen', { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <CadreAuth titre="Créer un compte citoyen" texte="Signalez les dépôts d’ordures de votre quartier et suivez leur ramassage.">
      <form onSubmit={soumettre} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Prénom">{(id) => <input id={id} className="champ" autoComplete="given-name" value={f.prenom} onChange={maj('prenom')} required />}</Champ>
          <Champ libelle="Nom">{(id) => <input id={id} className="champ" autoComplete="family-name" value={f.nom} onChange={maj('nom')} required />}</Champ>
        </div>
        <Champ libelle="Adresse e-mail">
          {(id) => <input id={id} type="email" className="champ" autoComplete="email" value={f.email} onChange={maj('email')} required />}
        </Champ>
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ libelle="Téléphone" aide="Facultatif">
            {(id) => <input id={id} type="tel" className="champ" autoComplete="tel" placeholder="034 00 000 00" value={f.telephone} onChange={maj('telephone')} />}
          </Champ>
          <Champ libelle="Quartier" aide="Facultatif">
            {(id) => (
              <select id={id} className="champ" value={f.quartier} onChange={maj('quartier')}>
                <option value="">Choisir…</option>
                {QUARTIERS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            )}
          </Champ>
        </div>
        <Champ libelle="Mot de passe" aide="Au moins 8 caractères, dont une lettre et un chiffre">
          {(id) => <input id={id} type="password" className="champ" autoComplete="new-password" value={f.mot_de_passe} onChange={maj('mot_de_passe')} required />}
        </Champ>
        {erreur && (
          <p className="rounded-xl bg-alerte-50 px-4 py-3 text-sm text-alerte-700" role="alert">
            {erreur}
          </p>
        )}
        <button type="submit" className="btn-principal w-full min-h-[48px] text-base" disabled={envoi || !f.prenom || !f.nom || !f.email || !mdpOk}>
          {envoi && <Spinner className="h-4 w-4 text-white" />}
          Créer mon compte
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-encre-doux">
        Déjà inscrit ?{' '}
        <Link to="/login" className="font-semibold text-foret-700 underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-encre-pale">Agents et chauffeurs : votre compte est créé par l’administrateur de la commune.</p>
    </CadreAuth>
  )
}

// Connexion et inscription sur une seule page. Sur ordinateur : une carte centrée en deux moitiés
// fixes, un volet photo d'Antananarivo couvre l'une et glisse vers l'autre. Sur téléphone : un
// interrupteur fait défiler les deux formulaires. L'adresse suit le formulaire (/login, /register).
// Fluidité : seuls transform et opacity sont animés (calculés par la carte graphique), aucun flou.
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ACCUEIL_PAR_ROLE } from '../../context/AuthContext'
import { messageErreur } from '../../api/axiosConfig'
import { demoDisponible } from '../../api'
import { ROLES } from '../../utils/format'
import { Champ, Spinner } from '../../components/common/ui'
import { Logo, Marque } from '../../components/layout/Logo'

const DUREE = 750 // ms
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const GLISSE = `transform ${DUREE}ms ${EASE}`

const QUARTIERS = ['Analakely', 'Isotry', 'Ampefiloha', 'Ambohipo', 'Andravoahangy', 'Autre quartier']

// Ce que dit le volet selon le formulaire qu'il laisse voir
const VOLET = {
  connexion: {
    image: '/images/tana-aerien.webp',
    titre: 'Nouveau sur Tanàna Madio ?',
    texte: 'Créez votre compte citoyen pour signaler un dépôt d’ordures et suivre son ramassage.',
    action: 'Créer un compte',
  },
  inscription: {
    image: '/images/tana-toits.webp',
    titre: 'Vous avez déjà un compte ?',
    texte: 'Retrouvez vos signalements, vos tournées ou l’administration de la plateforme.',
    action: 'Se connecter',
  },
}

function Erreur({ message }) {
  if (!message) return null
  return (
    <p className="rounded-xl bg-alerte-50 px-4 py-2.5 text-sm text-alerte-700" role="alert">
      {message}
    </p>
  )
}

function Entete({ titre, texte }) {
  return (
    <div className="mb-7">
      <h1 className="text-[28px] leading-tight sm:text-[30px]">{titre}</h1>
      <p className="mt-1.5 text-[15px] text-encre-doux">{texte}</p>
    </div>
  )
}

function FormulaireConnexion({ etat, setEtat }) {
  const { connecter } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const [voir, setVoir] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const { email, mdp } = etat

  const soumettre = async (e) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    try {
      const u = await connecter(email.trim(), mdp)
      toast.success(`Bonjour ${u.prenom}`)
      const depuis = lieu.state?.depuis
      navigate(depuis && !['/login', '/register'].includes(depuis) ? depuis : ACCUEIL_PAR_ROLE[u.role], { replace: true })
    } catch (err) {
      setErreur(messageErreur(err))
      setEnvoi(false)
    }
  }

  return (
    <>
      <Entete titre="Se connecter" texte="Accédez à votre espace : signalements, tournées ou administration." />
      <form onSubmit={soumettre} className="space-y-4" noValidate>
        <Champ libelle="Adresse e-mail">
          {(id) => <input id={id} type="email" className="champ" autoComplete="email" value={email} onChange={(e) => setEtat({ ...etat, email: e.target.value })} required />}
        </Champ>
        <Champ libelle="Mot de passe">
          {(id) => (
            <div className="relative">
              <input
                id={id}
                type={voir ? 'text' : 'password'}
                className="champ pr-12"
                autoComplete="current-password"
                value={mdp}
                onChange={(e) => setEtat({ ...etat, mdp: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setVoir(!voir)}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-encre-pale hover:text-ardoise"
                aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {voir ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          )}
        </Champ>
        <Erreur message={erreur} />
        <button type="submit" className="btn-principal min-h-[48px] w-full text-base" disabled={envoi || !email || !mdp}>
          {envoi && <Spinner className="h-4 w-4 text-white" />}
          Se connecter
        </button>
      </form>

      <EssaiSansCompte />
    </>
  )
}

// Pour les visiteurs (recruteurs, jury) : un clic ouvre l'espace d'un rôle avec ses données de démonstration.
// Le serveur ouvre la session lui-même ; aucun mot de passe n'est affiché.
function EssaiSansCompte() {
  const { connecterDemo } = useAuth()
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [encours, setEncours] = useState(null)

  useEffect(() => {
    demoDisponible()
      .then((r) => setRoles(r.disponible ? r.roles : []))
      .catch(() => setRoles([]))
  }, [])

  const essayer = async (role) => {
    setEncours(role)
    try {
      const u = await connecterDemo(role)
      toast.success(`Bonjour ${u.prenom}`)
      navigate(ACCUEIL_PAR_ROLE[u.role], { replace: true })
    } catch (err) {
      toast.error(messageErreur(err))
      setEncours(null)
    }
  }

  if (!roles.length) return null
  return (
    <div className="mt-6 border-t border-trait pt-5">
      <p className="text-sm font-medium text-ardoise">Essayer sans compte</p>
      <p className="mt-0.5 text-xs text-encre-doux">Ouvrez l’espace d’un rôle avec des données de démonstration.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {roles.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => essayer(role)}
            disabled={encours !== null}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-trait px-3 py-2 text-left text-sm font-medium text-ardoise transition-colors duration-200 hover:border-or/60 hover:bg-or-50 disabled:opacity-60"
          >
            {encours === role ? <Spinner className="h-3.5 w-3.5 text-or-700" /> : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-or" aria-hidden />}
            {ROLES[role]}
          </button>
        ))}
      </div>
    </div>
  )
}

function FormulaireInscription({ etat: f, setEtat: setF }) {
  const { inscrire } = useAuth()
  const navigate = useNavigate()
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState(null)
  const maj = (cle) => (e) => setF({ ...f, [cle]: e.target.value })
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
    <>
      <Entete titre="Créer un compte citoyen" texte="Signalez les dépôts d’ordures de votre quartier et suivez leur ramassage." />
      <form onSubmit={soumettre} className="space-y-3.5">
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Prénom">{(id) => <input id={id} className="champ" autoComplete="given-name" value={f.prenom} onChange={maj('prenom')} required />}</Champ>
          <Champ libelle="Nom">{(id) => <input id={id} className="champ" autoComplete="family-name" value={f.nom} onChange={maj('nom')} required />}</Champ>
        </div>
        <Champ libelle="Adresse e-mail">
          {(id) => <input id={id} type="email" className="champ" autoComplete="email" value={f.email} onChange={maj('email')} required />}
        </Champ>
        <div className="grid grid-cols-2 gap-3">
          <Champ libelle="Téléphone">
            {(id) => <input id={id} type="tel" className="champ" autoComplete="tel" placeholder="Facultatif" value={f.telephone} onChange={maj('telephone')} />}
          </Champ>
          <Champ libelle="Quartier">
            {(id) => (
              <select id={id} className={`champ ${f.quartier ? '' : 'text-encre-pale'}`} value={f.quartier} onChange={maj('quartier')}>
                <option value="">Facultatif</option>
                {QUARTIERS.map((q) => (
                  <option key={q}>{q}</option>
                ))}
              </select>
            )}
          </Champ>
        </div>
        <Champ libelle="Mot de passe" aide="8 caractères minimum, dont une lettre et un chiffre">
          {(id) => <input id={id} type="password" className="champ" autoComplete="new-password" value={f.mot_de_passe} onChange={maj('mot_de_passe')} required />}
        </Champ>
        <Erreur message={erreur} />
        <button type="submit" className="btn-principal min-h-[48px] w-full text-base" disabled={envoi || !f.prenom || !f.nom || !f.email || !mdpOk}>
          {envoi && <Spinner className="h-4 w-4 text-white" />}
          Créer mon compte
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-encre-pale">Agents et chauffeurs : votre compte est créé par l’administrateur.</p>
    </>
  )
}

// Largeur d'ordinateur (≥ 1024 px) : la carte à volet ; sinon la version téléphone (une seule des deux
// est dans la page, pour ne jamais avoir deux formulaires identiques)
function useOrdinateur() {
  const requete = '(min-width: 1024px)'
  const [ordinateur, setOrdinateur] = useState(() => window.matchMedia(requete).matches)
  useEffect(() => {
    const liste = window.matchMedia(requete)
    const surChangement = (e) => setOrdinateur(e.matches)
    liste.addEventListener('change', surChangement)
    return () => liste.removeEventListener('change', surChangement)
  }, [])
  return ordinateur
}

// Interrupteur du téléphone : pastille qui glisse sous l'onglet actif
function Interrupteur({ mode, onChoix }) {
  return (
    <div role="tablist" aria-label="Connexion ou inscription" className="relative grid grid-cols-2 rounded-full bg-fond p-1 ring-1 ring-trait">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-sombre will-change-transform"
        style={{ transform: mode === 'inscription' ? 'translate3d(100%,0,0)' : 'translate3d(0,0,0)', transition: GLISSE }}
      />
      {[
        ['connexion', 'Se connecter'],
        ['inscription', 'Créer un compte'],
      ].map(([cle, libelle]) => (
        <button
          key={cle}
          type="button"
          role="tab"
          aria-selected={mode === cle}
          onClick={() => onChoix(cle)}
          className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-500 ${mode === cle ? 'text-or-clair' : 'text-encre-doux'}`}
        >
          {libelle}
        </button>
      ))}
    </div>
  )
}

export default function Authentification() {
  const { connecte, user } = useAuth()
  const navigate = useNavigate()
  const lieu = useLocation()
  const mode = lieu.pathname.startsWith('/register') ? 'inscription' : 'connexion'
  const enInscription = mode === 'inscription'
  // pendant le glissement les deux formulaires existent ; ensuite seul le visible reste dans la page
  const [presents, setPresents] = useState(() => new Set([mode]))
  const [connexion, setConnexion] = useState({ email: '', mdp: '' })
  const [inscription, setInscription] = useState({ prenom: '', nom: '', email: '', telephone: '', quartier: '', mot_de_passe: '' })
  const minuterie = useRef(null)
  const ordinateur = useOrdinateur()

  useEffect(() => {
    setPresents((p) => (p.has(mode) ? p : new Set([...p, mode])))
    clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => setPresents(new Set([mode])), DUREE + 80)
    return () => clearTimeout(minuterie.current)
  }, [mode])

  if (connecte) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const basculer = (cible) => {
    const vers = cible ?? (enInscription ? 'connexion' : 'inscription')
    if (vers !== mode) navigate(vers === 'inscription' ? '/register' : '/login', { state: lieu.state })
  }

  // une moitié de la carte : visible, ou effacée (inerte, masquée aux lecteurs d'écran)
  const moitie = (cle, contenu, cote) => {
    const actif = mode === cle
    return (
      <section
        aria-hidden={!actif}
        inert={actif ? undefined : ''}
        className={`absolute inset-y-0 w-1/2 overflow-y-auto [scrollbar-width:thin] ${cote === 'gauche' ? 'left-0' : 'right-0'}`}
        style={{
          opacity: actif ? 1 : 0,
          transform: actif ? 'translate3d(0,0,0)' : `translate3d(${cote === 'gauche' ? '-24px' : '24px'},0,0)`,
          transition: `opacity ${actif ? 450 : 250}ms ease ${actif ? DUREE * 0.45 : 0}ms, ${GLISSE}`,
        }}
      >
        <div className="flex min-h-full flex-col justify-center px-12 py-10 xl:px-16">{presents.has(cle) && contenu}</div>
      </section>
    )
  }

  const connexionForm = <FormulaireConnexion etat={connexion} setEtat={setConnexion} />
  const inscriptionForm = <FormulaireInscription etat={inscription} setEtat={setInscription} />

  return (
    <div className="relative flex min-h-screen flex-col bg-sombre">
      {/* fond : vue d'Antananarivo voilée d'anthracite (immobile) */}
      <img src="/images/tana-aerien.webp" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sombre/70 via-sombre/85 to-sombre" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="Accueil Tanàna Madio">
          <Logo clair className="[&>img]:h-10" />
        </Link>
        <Link to="/" className="flex items-center gap-1.5 text-sm font-medium text-white/70 transition-colors hover:text-or-clair">
          <ArrowLeft className="h-4 w-4" /> Accueil
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-8 sm:px-8">
        {/* Ordinateur : carte en deux moitiés et volet */}
        {ordinateur ? (
        <div className="relative h-[min(680px,calc(100vh-130px))] min-h-[620px] w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_40px_120px_-30px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
          {moitie('connexion', connexionForm, 'gauche')}
          {moitie('inscription', inscriptionForm, 'droite')}

          <aside
            className="absolute inset-y-0 left-0 z-10 w-1/2 overflow-hidden bg-sombre will-change-transform"
            style={{ transform: enInscription ? 'translate3d(0,0,0)' : 'translate3d(100%,0,0)', transition: GLISSE }}
          >
            {Object.entries(VOLET).map(([cle, v]) => (
              <img
                key={cle}
                src={v.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: mode === cle ? 1 : 0, transition: `opacity ${DUREE}ms ${EASE}` }}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-sombre via-sombre/70 to-sombre/30" aria-hidden />

            <div className="relative flex h-full flex-col justify-between p-11">
              <span className="flex items-center gap-2.5 self-start rounded-full bg-black/30 py-1.5 pl-1.5 pr-4 ring-1 ring-or/30">
                <Marque blanc className="h-7 w-7" alt="" />
                <span className="text-[13px] font-medium text-white/85">Signaler · Collecter · Ville propre</span>
              </span>
              <div className="relative min-h-[220px]">
                {Object.entries(VOLET).map(([cle, v]) => {
                  const actif = mode === cle
                  return (
                    <div
                      key={cle}
                      aria-hidden={!actif}
                      className="absolute inset-x-0 bottom-0"
                      style={{
                        opacity: actif ? 1 : 0,
                        transform: actif ? 'translate3d(0,0,0)' : 'translate3d(0,16px,0)',
                        transition: `opacity 400ms ease ${actif ? DUREE * 0.5 : 0}ms, transform 500ms ${EASE} ${actif ? DUREE * 0.5 : 0}ms`,
                        pointerEvents: actif ? 'auto' : 'none',
                      }}
                    >
                      <span className="block h-px w-12 bg-or" aria-hidden />
                      <p className="mt-5 font-titre text-[30px] font-semibold leading-tight text-white">{v.titre}</p>
                      <p className="mt-3 max-w-sm text-[15px] text-white/70">{v.texte}</p>
                      <button type="button" tabIndex={actif ? 0 : -1} onClick={() => basculer()} className="btn-or mt-7 min-h-[48px] px-6">
                        {cle === 'inscription' && <ArrowLeft className="h-4 w-4" />}
                        {v.action}
                        {cle === 'connexion' && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>
        </div>
        ) : (
        /* Téléphone et tablette : interrupteur et défilement des deux formulaires */
        <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
          <div className="p-5 pb-0 sm:p-7 sm:pb-0">
            <Interrupteur mode={mode} onChoix={basculer} />
          </div>
          <div className="flex w-[200%] items-start will-change-transform" style={{ transform: enInscription ? 'translate3d(-50%,0,0)' : 'translate3d(0,0,0)', transition: GLISSE }}>
            {[
              ['connexion', connexionForm],
              ['inscription', inscriptionForm],
            ].map(([cle, contenu]) => (
              <section key={cle} aria-hidden={mode !== cle} inert={mode === cle ? undefined : ''} className="w-1/2 px-5 py-7 sm:px-7">
                {presents.has(cle) && contenu}
              </section>
            ))}
          </div>
        </div>
        )}
      </main>
    </div>
  )
}

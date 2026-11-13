// Connexion et inscription sur une seule page, reliées par un « volet » : sur ordinateur, les deux
// formulaires sont côte à côte et une vue d'Antananarivo en couvre un ; passer de l'un à l'autre fait
// glisser le volet (parallaxe sur la photo, lame dorée sur le bord). Sur téléphone, un interrupteur
// fait défiler les formulaires. L'adresse suit le formulaire affiché (/login, /register).
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ACCUEIL_PAR_ROLE } from '../../context/AuthContext'
import { messageErreur } from '../../api/axiosConfig'
import { Champ, Spinner } from '../../components/common/ui'
import { Logo, Marque } from '../../components/layout/Logo'
import { ROLES } from '../../utils/format'

const DUREE = 900 // ms, durée du glissement du volet
const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)'

// Comptes de la base de démonstration (désactivables avec VITE_COMPTES_DEMO=false)
const DEMO = import.meta.env.VITE_COMPTES_DEMO !== 'false'
const COMPTES = [
  ['citoyen@tananamadio.mg', 'citoyen'],
  ['agent@tananamadio.mg', 'agent_municipal'],
  ['chauffeur@tananamadio.mg', 'chauffeur'],
  ['admin@tananamadio.mg', 'administrateur'],
]
const QUARTIERS = ['Analakely', 'Isotry', 'Ampefiloha', 'Ambohipo', 'Andravoahangy', 'Autre quartier']

// Ce que dit le volet, selon le formulaire qu'il laisse voir
const VOLET = {
  connexion: {
    image: '/images/tana-aerien.webp',
    titre: 'Pas encore de compte ?',
    texte: 'Signalez les dépôts d’ordures de votre quartier et suivez leur ramassage, jusqu’au passage du camion.',
    action: 'Créer un compte citoyen',
    legende: 'Antananarivo, autour du lac Anosy',
  },
  inscription: {
    image: '/images/tana-toits.webp',
    titre: 'Déjà inscrit ?',
    texte: 'Retrouvez vos signalements, vos tournées ou l’administration de la plateforme.',
    action: 'Se connecter',
    legende: 'Antananarivo, la haute ville',
  },
}

function Erreur({ message }) {
  if (!message) return null
  return (
    <p className="rounded-xl bg-alerte-50 px-4 py-3 text-sm text-alerte-700" role="alert">
      {message}
    </p>
  )
}

function Entete({ titre, texte }) {
  return (
    <>
      {/* ordinateur : le logo accompagne le formulaire visible */}
      <Link to="/" aria-label="Accueil Tanàna Madio" className="mb-12 hidden self-start lg:block">
        <Logo />
      </Link>
      <span className="block h-1 w-10 rounded-full bg-or" aria-hidden />
      <h1 className="mt-5 text-[32px] leading-tight sm:text-[34px]">{titre}</h1>
      <p className="mt-2 text-encre-doux">{texte}</p>
    </>
  )
}

function FormulaireConnexion({ etat, setEtat, onBasculer }) {
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
      <form onSubmit={soumettre} className="mt-8 space-y-4" noValidate>
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
      <p className="mt-6 text-center text-sm text-encre-doux lg:hidden">
        Pas encore de compte ?{' '}
        <button type="button" onClick={onBasculer} className="font-semibold text-marque underline-offset-4 hover:underline">
          Créer un compte citoyen
        </button>
      </p>

      {DEMO && (
        <div className="mt-8 rounded-2xl border border-or/30 bg-or-50/60 p-4">
          <p className="text-sm font-semibold text-ardoise">Comptes de démonstration</p>
          <p className="mt-0.5 text-xs text-encre-pale">Mot de passe : Admin2025!</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {COMPTES.map(([adresse, role]) => (
              <button
                key={adresse}
                type="button"
                onClick={() => setEtat({ email: adresse, mdp: 'Admin2025!' })}
                className="rounded-xl border border-trait bg-white px-3 py-2 text-left text-sm transition duration-200 hover:-translate-y-px hover:border-or/60 hover:shadow-survol"
              >
                <span className="block font-medium text-ardoise">{ROLES[role]}</span>
                <span className="block truncate text-xs text-encre-pale">{adresse}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function FormulaireInscription({ etat: f, setEtat: setF, onBasculer }) {
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
      <form onSubmit={soumettre} className="mt-8 space-y-4">
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
        <Erreur message={erreur} />
        <button type="submit" className="btn-principal min-h-[48px] w-full text-base" disabled={envoi || !f.prenom || !f.nom || !f.email || !mdpOk}>
          {envoi && <Spinner className="h-4 w-4 text-white" />}
          Créer mon compte
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-encre-doux lg:hidden">
        Déjà inscrit ?{' '}
        <button type="button" onClick={onBasculer} className="font-semibold text-marque underline-offset-4 hover:underline">
          Se connecter
        </button>
      </p>
      <p className="mt-3 text-center text-xs text-encre-pale">Agents et chauffeurs : votre compte est créé par l’administrateur de la commune.</p>
    </>
  )
}

// Interrupteur du téléphone : pastille or qui glisse sous l'onglet actif
function Interrupteur({ mode, onChoix }) {
  return (
    <div role="tablist" aria-label="Connexion ou inscription" className="relative grid grid-cols-2 rounded-full bg-fond p-1 ring-1 ring-trait lg:hidden">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-sombre shadow-or transition-transform duration-500"
        style={{ transform: mode === 'inscription' ? 'translateX(100%)' : 'translateX(0)', transitionTimingFunction: EASE }}
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
          className={`relative z-10 rounded-full py-2.5 text-sm font-semibold transition-colors duration-300 ${mode === cle ? 'text-or-clair' : 'text-encre-doux'}`}
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
  // pendant le glissement, les deux formulaires restent affichés ; ensuite seul le visible est gardé
  const [presents, setPresents] = useState(() => new Set([mode]))
  const [connexion, setConnexion] = useState({ email: '', mdp: '' })
  const [inscription, setInscription] = useState({ prenom: '', nom: '', email: '', telephone: '', quartier: '', mot_de_passe: '' })
  const minuterie = useRef(null)

  useEffect(() => {
    setPresents((p) => new Set([...p, mode]))
    clearTimeout(minuterie.current)
    minuterie.current = setTimeout(() => setPresents(new Set([mode])), DUREE + 50)
    return () => clearTimeout(minuterie.current)
  }, [mode])

  if (connecte) return <Navigate to={ACCUEIL_PAR_ROLE[user.role]} replace />

  const basculer = (cible) => {
    const vers = cible ?? (mode === 'connexion' ? 'inscription' : 'connexion')
    if (vers !== mode) navigate(vers === 'inscription' ? '/register' : '/login', { state: lieu.state })
  }
  const enInscription = mode === 'inscription'
  const volet = VOLET[mode]

  // un formulaire : visible, ou en train de s'effacer (inerte et masqué aux lecteurs d'écran)
  const panneau = (cle, contenu) => {
    const actif = mode === cle
    const decalage = cle === 'connexion' ? '-48px' : '48px'
    return (
      <section
        aria-hidden={!actif}
        inert={actif ? undefined : ''}
        className="col-start-1 row-start-1 lg:col-auto lg:row-auto"
        style={{
          opacity: actif ? 1 : 0,
          transform: actif ? 'none' : `translateX(${decalage})`,
          filter: actif ? 'none' : 'blur(6px)',
          transition: `opacity 600ms ${EASE} ${actif ? '300ms' : '0ms'}, transform 900ms ${EASE}, filter 600ms ${EASE}`,
          pointerEvents: actif ? 'auto' : 'none',
        }}
      >
        <div className="mx-auto flex w-full max-w-[440px] flex-col justify-center py-8 lg:min-h-screen lg:py-16">{presents.has(cle) && contenu}</div>
      </section>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      {/* Logo et retour à l'accueil, au-dessus des deux moitiés */}
      <header className="relative z-30 flex items-center px-5 pt-[max(20px,env(safe-area-inset-top))] sm:px-10 lg:hidden">
        <Link to="/" aria-label="Accueil Tanàna Madio">
          <Logo />
        </Link>
      </header>

      <div className="mx-auto grid w-full max-w-[1480px] px-5 pb-10 pt-6 sm:px-10 lg:min-h-screen lg:grid-cols-2 lg:gap-24 lg:px-16 lg:pt-0">
        <div className="mx-auto mb-2 w-full max-w-[440px] lg:hidden">
          <Interrupteur mode={mode} onChoix={basculer} />
        </div>
        <div className="grid lg:contents">
          {panneau('connexion', <FormulaireConnexion etat={connexion} setEtat={setConnexion} onBasculer={() => basculer('inscription')} />)}
          {panneau('inscription', <FormulaireInscription etat={inscription} setEtat={setInscription} onBasculer={() => basculer('connexion')} />)}
        </div>
      </div>

      {/* Le volet (ordinateur) : il couvre le formulaire caché et glisse d'une moitié à l'autre */}
      <aside
        className="absolute inset-y-0 left-0 z-20 hidden w-1/2 overflow-hidden bg-sombre lg:block"
        style={{ transform: enInscription ? 'translateX(0)' : 'translateX(100%)', transition: `transform ${DUREE}ms ${EASE}` }}
      >
        {Object.entries(VOLET).map(([cle, v]) => (
          <img
            key={cle}
            src={v.image}
            alt=""
            className="absolute inset-0 h-full w-[120%] max-w-none object-cover object-[50%_70%]"
            style={{
              opacity: mode === cle ? 1 : 0,
              transform: `translateX(${enInscription ? '-4%' : '-12%'}) scale(1.04)`,
              transition: `opacity ${DUREE}ms ${EASE}, transform ${DUREE}ms ${EASE}`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-sombre via-sombre/60 to-sombre/25" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_100%,rgba(201,165,92,0.18),transparent_70%)]" aria-hidden />
        {/* lame dorée sur le bord qui touche le formulaire */}
        <span
          aria-hidden
          className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-or to-transparent transition-all duration-700"
          style={{ left: enInscription ? 'auto' : 0, right: enInscription ? 0 : 'auto' }}
        />

        <div className="absolute left-10 top-8 flex items-center gap-3 rounded-full bg-sombre/50 py-1.5 pl-1.5 pr-4 ring-1 ring-or/30 backdrop-blur-md">
          <Marque blanc className="h-8 w-8" alt="" />
          <span className="text-sm font-medium text-white/85">Signaler · Collecter · Ville propre</span>
        </div>

        <div key={mode} className="animate-poser absolute inset-x-0 bottom-0 p-12" style={{ animationDelay: `${DUREE * 0.45}ms` }}>
          <span className="block h-px w-14 bg-or" aria-hidden />
          <p className="mt-6 font-titre text-[34px] font-semibold leading-tight text-white">{volet.titre}</p>
          <p className="mt-3 max-w-md text-white/70">{volet.texte}</p>
          <button type="button" onClick={() => basculer()} className="btn-or mt-8 min-h-[50px] px-7 text-base">
            {enInscription && <ArrowLeft className="h-4 w-4" />}
            {volet.action}
            {!enInscription && <ArrowRight className="h-4 w-4" />}
          </button>
          <p className="mt-8 text-sm text-or-clair/70">{volet.legende}</p>
        </div>
      </aside>
    </div>
  )
}

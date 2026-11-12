// Robustesse de l'interface : écran d'erreur propre si une page plante, et titre d'onglet par page
import { Component, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { RotateCcw } from 'lucide-react'
import { Marque } from './Logo'

// Une erreur d'affichage ne laisse jamais une page blanche ; elle s'efface en changeant de page
export class GardeErreur extends Component {
  state = { erreur: null }

  static getDerivedStateFromError(erreur) {
    return { erreur }
  }

  componentDidUpdate(precedent) {
    if (this.state.erreur && precedent.cle !== this.props.cle) this.setState({ erreur: null })
  }

  componentDidCatch(erreur, info) {
    console.error('Erreur d’affichage :', erreur, info.componentStack)
  }

  render() {
    if (!this.state.erreur) return this.props.children
    // nouvelle version déployée pendant que la page était ouverte : un rechargement suffit
    const nouvelleVersion = /dynamically imported module|Loading chunk|Failed to fetch/i.test(String(this.state.erreur?.message))
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center" role="alert">
        <Marque className="h-12 w-12" />
        <h1 className="mt-6 text-2xl">{nouvelleVersion ? 'Une nouvelle version est disponible' : 'Cette page n’a pas pu s’afficher'}</h1>
        <p className="mt-2 max-w-md text-encre-doux">
          {nouvelleVersion
            ? 'Rechargez la page pour utiliser la dernière version de l’application.'
            : 'Rechargez la page. Si le problème continue, revenez à l’accueil et réessayez plus tard.'}
        </p>
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-principal" onClick={() => window.location.reload()}>
            <RotateCcw className="h-4 w-4" /> Recharger la page
          </button>
          <a href="/" className="btn-secondaire">
            Accueil
          </a>
        </div>
      </div>
    )
  }
}

const TITRES = [
  [/^\/$/, null],
  [/^\/login/, 'Se connecter'],
  [/^\/register/, 'Créer un compte'],
  [/^\/conditions/, 'Conditions et confidentialité'],
  [/^\/chauffeur\/tournees\/./, 'Tournée'],
  [/^\/chauffeur\/tournees/, 'Mes tournées'],
  [/^\/compte/, 'Mon compte'],
  [/^\/citoyen\/signaler/, 'Signaler un dépôt'],
  [/^\/citoyen\/signalements/, 'Mes signalements'],
  [/^\/citoyen/, 'Carte des signalements'],
  [/^\/agent\/signalements/, 'Signalements à valider'],
  [/^\/agent\/planifier/, 'Planifier une tournée'],
  [/^\/agent\/collectes/, 'Collectes'],
  [/^\/agent\/camions/, 'Camions'],
  [/^\/agent/, 'Tableau de bord'],
  [/^\/chauffeur/, 'Tableau de bord chauffeur'],
  [/^\/admin\/utilisateurs/, 'Utilisateurs'],
  [/^\/admin\/camions/, 'Camions'],
  [/^\/admin\/zones/, 'Zones de collecte'],
  [/^\/admin\/stats/, 'Statistiques'],
  [/^\/admin\/journal/, 'Journal d’activité'],
  [/^\/admin/, 'Administration'],
]

export function TitreDePage() {
  const { pathname } = useLocation()
  useEffect(() => {
    const trouve = TITRES.find(([motif]) => motif.test(pathname))
    const titre = trouve ? trouve[1] : 'Page introuvable'
    document.title = titre ? `${titre} · Tanàna Madio` : 'Tanàna Madio · Signaler, collecter, assainir Antananarivo'
  }, [pathname])
  return null
}

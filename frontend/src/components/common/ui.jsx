// Petits composants d'interface partagés. Les textes reçus sont traduits ici (français ou malagasy),
// ce qui traduit d'un coup les titres, champs, filtres et fenêtres de tous les écrans.
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useLangue } from '../../context/LangueContext'

// traduit un texte simple, laisse passer les éléments React et les valeurs vides
function useTraduire() {
  const { t } = useLangue()
  return (v) => (typeof v === 'string' ? t(v) : v)
}

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-vert-500 ${className}`} aria-label="Chargement" />
}

// Chargement : la forme du contenu à venir (squelette) plutôt qu'une roue qui tourne
export function Chargement({ texte = 'Chargement…', lignes = 3 }) {
  const tr = useTraduire()
  return (
    <div className="space-y-3 py-4" role="status" aria-live="polite">
      <span className="sr-only">{tr(texte)}</span>
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 rounded-carte border border-trait bg-white p-4" aria-hidden>
          <div className="h-10 w-10 shrink-0 rounded-lg bg-fond" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded bg-fond" style={{ width: `${70 - i * 12}%` }} />
            <div className="h-3 w-2/5 rounded bg-fond" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Erreur({ message, onReessayer }) {
  const tr = useTraduire()
  return (
    <div className="carte flex flex-col items-start gap-3 border-alerte/20 bg-alerte-50/60 p-5 sm:flex-row sm:items-center" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-alerte-700" />
      <p className="flex-1 text-sm text-alerte-700">{tr(message)}</p>
      {onReessayer && (
        <button type="button" className="btn-secondaire" onClick={() => onReessayer()}>
          {tr('Réessayer')}
        </button>
      )}
    </div>
  )
}

// Écran vide : dire quoi faire, pas seulement « rien »
export function Vide({ icone: Icone, titre, texte, action }) {
  const tr = useTraduire()
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icone && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-vert-100 text-vert">
          <Icone className="h-6 w-6" />
        </span>
      )}
      <p className="font-titre text-lg font-semibold text-ardoise">{tr(titre)}</p>
      {texte && <p className="mt-1 max-w-sm text-sm text-encre-doux">{tr(texte)}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function EnTete({ titre, texte, actions }) {
  const tr = useTraduire()
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">{tr(titre)}</h1>
        {texte && <p className="mt-1 max-w-2xl text-encre-doux">{tr(texte)}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

// Chiffre clé : le nombre d'abord, l'étiquette ensuite
// Carte d'indicateur : libellé, grand chiffre, tendance, mini-graphique. Fond blanc pour tous ;
// la couleur ne porte que sur l'icône et la courbe, pour que le chiffre reste le premier repère.
const TONS = {
  vert: { icone: 'bg-vert-50 text-vert', trait: '#008043' },
  ambre: { icone: 'bg-or-50 text-or-700 ring-1 ring-or/25', trait: '#C9A55C' },
  bleu: { icone: 'bg-sombre text-or', trait: '#062A1C' },
  violet: { icone: 'bg-or-50 text-or-700 ring-1 ring-or/25', trait: '#C9A55C' },
  alerte: { icone: 'bg-alerte-50 text-alerte-700', trait: '#DC2626' },
  blanc: { icone: 'bg-vert-50 text-vert', trait: '#008043' },
}

function MiniCourbe({ valeurs, couleur }) {
  if (!valeurs?.length || valeurs.every((v) => v === 0)) return null
  const max = Math.max(...valeurs, 1)
  const pts = valeurs.map((v, i) => `${(i / (valeurs.length - 1)) * 100},${28 - (v / max) * 26}`).join(' ')
  return (
    <svg viewBox="0 0 100 30" className="mt-2 h-8 w-28" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={couleur} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export function Chiffre({ valeur, libelle, detail, icone: Icone, ton = 'blanc', tendance, serie }) {
  const t = TONS[ton] ?? TONS.blanc
  const tr = useTraduire()
  const hausse = tendance != null && tendance >= 0
  return (
    <div className="carte relative flex min-h-[132px] flex-col p-5 transition-shadow duration-300 hover:shadow-survol">
      <p className="pr-12 text-sm font-medium text-encre-doux">{tr(libelle)}</p>
      <p className="chiffre mt-2 text-[32px] leading-none text-ardoise">{valeur}</p>
      {tendance != null && (
        <p className={`mt-1 inline-flex items-center gap-1 text-sm font-semibold ${hausse ? 'text-vert' : 'text-alerte-700'}`}>
          <span aria-hidden>{hausse ? '↗' : '↘'}</span>
          {hausse ? '+' : ''}
          {tendance.toLocaleString('fr-FR')} % {tr('ce mois')}
        </p>
      )}
      {detail && <p className="mt-1 text-xs text-encre-pale">{tr(detail)}</p>}
      <MiniCourbe valeurs={serie} couleur={t.trait} />
      {Icone && (
        <span className={`absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl ${t.icone}`}>
          <Icone className="h-5 w-5" />
        </span>
      )}
    </div>
  )
}

// Compteur centré (« 40 Total », « 4 En attente »…) comme sur la version d'origine
const COULEURS_COMPTEUR = { vert: 'text-vert', ambre: 'text-or-700', bleu: 'text-sombre', violet: 'text-or-700', ardoise: 'text-ardoise' }
export function Compteur({ valeur, libelle, couleur = 'vert' }) {
  const tr = useTraduire()
  return (
    <div className="carte flex flex-col items-center justify-center px-4 py-5 text-center">
      <p className={`chiffre text-[30px] leading-none ${COULEURS_COMPTEUR[couleur]}`}>{valeur}</p>
      <p className="mt-2 text-sm text-encre-doux">{tr(libelle)}</p>
    </div>
  )
}

export function Champ({ libelle, aide, erreur, children, className = '' }) {
  const id = useId()
  const tr = useTraduire()
  const enfant = typeof children === 'function' ? children(id) : children
  return (
    <div className={className}>
      <label htmlFor={id} className="etiquette">
        {tr(libelle)}
      </label>
      {enfant}
      {erreur ? <p className="mt-1 text-xs text-alerte-700">{tr(erreur)}</p> : aide && <p className="mt-1 text-xs text-encre-pale">{tr(aide)}</p>}
    </div>
  )
}

// Segments (filtres) : boutons radio visuels
export function Segments({ options, valeur, onChange, libelle }) {
  const tr = useTraduire()
  return (
    <div role="radiogroup" aria-label={tr(libelle)} className="inline-flex max-w-full gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
          className={`shrink-0 whitespace-nowrap rounded-lg border-[1.5px] px-3.5 py-1.5 text-sm font-semibold transition ${
            valeur === o.valeur ? 'border-vert bg-vert text-white shadow-sm' : 'border-vert-300 bg-white text-vert hover:bg-vert-50'
          }`}
        >
          {tr(o.libelle)}
          {o.nombre != null && <span className={`ml-1.5 tabular-nums ${valeur === o.valeur ? 'text-white/80' : 'text-vert/60'}`}>{o.nombre}</span>}
        </button>
      ))}
    </div>
  )
}

export function Modal({ ouvert, onFermer, titre, children, pied, large = false }) {
  const boite = useRef(null)
  const tr = useTraduire()
  // dernière fonction de fermeture : l'effet ne se relance pas (et ne vole pas le focus) à chaque rendu du parent
  const fermer = useRef(onFermer)
  fermer.current = onFermer
  useEffect(() => {
    if (!ouvert) return undefined
    const surTouche = (e) => e.key === 'Escape' && fermer.current()
    document.addEventListener('keydown', surTouche)
    const precedent = document.activeElement
    boite.current?.querySelector('input, select, textarea, button')?.focus()
    return () => {
      document.removeEventListener('keydown', surTouche)
      precedent?.focus?.()
    }
  }, [ouvert])

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ardoise/50 backdrop-blur-[2px]" onClick={onFermer} aria-hidden />
          <motion.div
            ref={boite}
            role="dialog"
            aria-modal="true"
            aria-label={tr(titre)}
            className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-flotte sm:rounded-3xl ${large === 'xl' ? 'sm:max-w-5xl' : large ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-trait px-6 py-4">
              <h2 className="text-lg font-semibold">{tr(titre)}</h2>
              <button type="button" onClick={onFermer} className="btn-discret -mr-2 min-h-0 p-2" aria-label={tr('Fermer')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5">{children}</div>
            {pied && <div className="flex flex-wrap justify-end gap-2 border-t border-trait px-6 py-4">{pied}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// Confirmation d'une action qui ne se défait pas
export function Confirmation({ ouvert, onFermer, onConfirmer, titre, texte, action = 'Confirmer', danger = false, enCours = false }) {
  const tr = useTraduire()
  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={titre}
      pied={
        <>
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            {tr('Retour')}
          </button>
          <button type="button" className={danger ? 'btn bg-alerte text-white hover:bg-alerte-700' : 'btn-principal'} onClick={onConfirmer} disabled={enCours}>
            {enCours && <Spinner className="h-4 w-4 text-current" />}
            {tr(action)}
          </button>
        </>
      }
    >
      <p className="text-encre-doux">{tr(texte)}</p>
    </Modal>
  )
}

export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  const tr = useTraduire()
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-4 text-sm text-encre-doux">
      <span>
        {tr('Page')} {page} {tr('sur')} {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondaire min-h-[36px]" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {tr('Précédente')}
        </button>
        <button type="button" className="btn-secondaire min-h-[36px]" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          {tr('Suivante')}
        </button>
      </div>
    </div>
  )
}

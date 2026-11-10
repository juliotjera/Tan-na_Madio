// Petits composants d'interface partagés
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, X } from 'lucide-react'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-feuille-600 ${className}`} aria-label="Chargement" />
}

export function Chargement({ texte = 'Chargement…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-encre-doux" role="status">
      <Spinner />
      <span>{texte}</span>
    </div>
  )
}

export function Erreur({ message, onReessayer }) {
  return (
    <div className="carte flex flex-col items-start gap-3 border-alerte/20 bg-alerte-50/60 p-5 sm:flex-row sm:items-center" role="alert">
      <AlertTriangle className="h-5 w-5 shrink-0 text-alerte-700" />
      <p className="flex-1 text-sm text-alerte-700">{message}</p>
      {onReessayer && (
        <button type="button" className="btn-secondaire" onClick={() => onReessayer()}>
          Réessayer
        </button>
      )}
    </div>
  )
}

// Écran vide : dire quoi faire, pas seulement « rien »
export function Vide({ icone: Icone, titre, texte, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icone && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-feuille-100 text-foret-700">
          <Icone className="h-6 w-6" />
        </span>
      )}
      <p className="font-titre text-lg font-semibold text-foret">{titre}</p>
      {texte && <p className="mt-1 max-w-sm text-sm text-encre-doux">{texte}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function EnTete({ titre, texte, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">{titre}</h1>
        {texte && <p className="mt-1 max-w-2xl text-encre-doux">{texte}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

// Chiffre clé : le nombre d'abord, l'étiquette ensuite
export function Chiffre({ valeur, libelle, detail, icone: Icone, ton = 'neutre' }) {
  const tons = {
    neutre: 'bg-feuille-100 text-foret-700',
    ambre: 'bg-ambre-100 text-ambre-700',
    alerte: 'bg-alerte-100 text-alerte-700',
    foret: 'bg-foret text-feuille',
  }
  return (
    <div className="carte flex items-start gap-4 p-5">
      {Icone && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tons[ton]}`}>
          <Icone className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="chiffre text-[28px] leading-none text-foret">{valeur}</p>
        <p className="mt-1.5 text-sm font-medium text-encre">{libelle}</p>
        {detail && <p className="mt-0.5 text-xs text-encre-pale">{detail}</p>}
      </div>
    </div>
  )
}

export function Champ({ libelle, aide, erreur, children, className = '' }) {
  const id = useId()
  const enfant = typeof children === 'function' ? children(id) : children
  return (
    <div className={className}>
      <label htmlFor={id} className="etiquette">
        {libelle}
      </label>
      {enfant}
      {erreur ? <p className="mt-1 text-xs text-alerte-700">{erreur}</p> : aide && <p className="mt-1 text-xs text-encre-pale">{aide}</p>}
    </div>
  )
}

// Segments (filtres) : boutons radio visuels
export function Segments({ options, valeur, onChange, libelle }) {
  return (
    <div role="radiogroup" aria-label={libelle} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-trait bg-white p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
          className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            valeur === o.valeur ? 'bg-foret-700 text-white' : 'text-encre-doux hover:bg-feuille-50 hover:text-foret'
          }`}
        >
          {o.libelle}
          {o.nombre != null && <span className={`ml-1.5 tabular-nums ${valeur === o.valeur ? 'text-feuille' : 'text-encre-pale'}`}>{o.nombre}</span>}
        </button>
      ))}
    </div>
  )
}

export function Modal({ ouvert, onFermer, titre, children, pied, large = false }) {
  const boite = useRef(null)
  useEffect(() => {
    if (!ouvert) return undefined
    const surTouche = (e) => e.key === 'Escape' && onFermer()
    document.addEventListener('keydown', surTouche)
    const precedent = document.activeElement
    boite.current?.querySelector('input, select, textarea, button')?.focus()
    return () => {
      document.removeEventListener('keydown', surTouche)
      precedent?.focus?.()
    }
  }, [ouvert, onFermer])

  return createPortal(
    <AnimatePresence>
      {ouvert && (
        <motion.div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-foret/50 backdrop-blur-[2px]" onClick={onFermer} aria-hidden />
          <motion.div
            ref={boite}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
            className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-flotte sm:rounded-3xl ${large ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-trait px-6 py-4">
              <h2 className="text-lg font-semibold">{titre}</h2>
              <button type="button" onClick={onFermer} className="btn-discret -mr-2 min-h-0 p-2" aria-label="Fermer">
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
  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      titre={titre}
      pied={
        <>
          <button type="button" className="btn-secondaire" onClick={onFermer}>
            Retour
          </button>
          <button type="button" className={danger ? 'btn bg-alerte text-white hover:bg-alerte-700' : 'btn-principal'} onClick={onConfirmer} disabled={enCours}>
            {enCours && <Spinner className="h-4 w-4 text-current" />}
            {action}
          </button>
        </>
      }
    >
      <p className="text-encre-doux">{texte}</p>
    </Modal>
  )
}

export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 px-1 pt-4 text-sm text-encre-doux">
      <span>
        Page {page} sur {pages}
      </span>
      <div className="flex gap-2">
        <button type="button" className="btn-secondaire min-h-[36px]" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Précédente
        </button>
        <button type="button" className="btn-secondaire min-h-[36px]" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Suivante
        </button>
      </div>
    </div>
  )
}

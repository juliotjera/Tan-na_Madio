// Cloche de notifications : nombre de non lues, liste déroulante, lien vers l'élément concerné.
// Les nouvelles notifications arrivent en temps réel (flux SSE) ; un rafraîchissement lent reste en secours.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Route, Truck, XCircle } from 'lucide-react'
import { lireNotification, listerNotifications, toutLire } from '../../api'
import { useDonnees } from '../../hooks/useDonnees'
import { useFluxNotifications } from '../../hooks/useFluxNotifications'
import { ilYa } from '../../utils/format'
import { useLangue } from '../../context/LangueContext'

const ICONES = {
  urgence_critique: [AlertTriangle, 'bg-alerte-100 text-alerte-700'],
  signalement_valide: [CheckCircle2, 'bg-or-50 text-marque'],
  signalement_rejete: [XCircle, 'bg-slate-100 text-slate-600'],
  signalement_planifie: [Route, 'bg-or-50 text-marque'],
  signalement_collecte: [CheckCircle2, 'bg-marque text-white'],
  tournee_affectee: [Truck, 'bg-ambre-100 text-ambre-700'],
  tournee_terminee: [CheckCheck, 'bg-or-50 text-marque'],
  tournee_annulee: [XCircle, 'bg-slate-100 text-slate-600'],
}

export default function Cloche({ sombre = false, alignement = 'droite' }) {
  const navigate = useNavigate()
  const [ouvert, setOuvert] = useState(false)
  const boite = useRef(null)
  const { donnees, setDonnees, recharger } = useDonnees(() => listerNotifications({ limit: 15 }), [], { intervalle: 300000 })
  const nonLues = donnees?.non_lues ?? 0
  const { t } = useLangue()

  useFluxNotifications((n) => {
    setDonnees((d) => (d ? { ...d, non_lues: d.non_lues + 1, notifications: [n, ...d.notifications.filter((x) => x.id !== n.id)].slice(0, 15) } : d))
    toast(n.titre, { icon: '🔔', id: n.id })
  })

  // Alt+N : ouvrir ou fermer les notifications
  useEffect(() => {
    const surTouche = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setOuvert((o) => !o)
        recharger({ silencieux: true })
      }
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [recharger])

  // fermeture au clic extérieur et à la touche Échap
  useEffect(() => {
    if (!ouvert) return undefined
    const dehors = (e) => !boite.current?.contains(e.target) && setOuvert(false)
    const echap = (e) => e.key === 'Escape' && setOuvert(false)
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  const ouvrir = async (n) => {
    setOuvert(false)
    if (!n.lu) {
      setDonnees((d) => ({ ...d, non_lues: Math.max(0, d.non_lues - 1), notifications: d.notifications.map((x) => (x.id === n.id ? { ...x, lu: true } : x)) }))
      lireNotification(n.id).catch(() => recharger({ silencieux: true }))
    }
    if (n.lien) navigate(n.lien)
  }

  const toutMarquer = async () => {
    setDonnees((d) => ({ ...d, non_lues: 0, notifications: d.notifications.map((x) => ({ ...x, lu: true })) }))
    await toutLire().catch(() => recharger({ silencieux: true }))
  }

  return (
    <div className="relative" ref={boite}>
      <button
        type="button"
        onClick={() => {
          setOuvert(!ouvert)
          if (!ouvert) recharger({ silencieux: true })
        }}
        className={`relative flex h-10 w-10 items-center justify-center rounded-lg transition ${sombre ? 'text-or-100 hover:bg-white/10 hover:text-white' : 'text-encre-doux hover:bg-ardoise/5 hover:text-ardoise'}`}
        aria-label={nonLues ? `Notifications, ${nonLues} non lue${nonLues > 1 ? 's' : ''}` : 'Notifications'}
        title="Notifications (Alt+N)"
        aria-expanded={ouvert}
      >
        <Bell className="h-5 w-5" />
        {nonLues > 0 && (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-alerte px-1 text-[11px] font-bold leading-none text-white">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>

      <AnimatePresence>
        {ouvert && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-12 z-[1100] w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-carte border border-trait bg-white text-encre shadow-flotte ${
              alignement === 'gauche' ? 'left-0' : 'right-0'
            }`}
            role="dialog"
            aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b border-trait px-4 py-3">
              <p className="font-titre text-[17px] font-bold text-ardoise">{t('Notifications')}</p>
              {nonLues > 0 && (
                <button type="button" onClick={toutMarquer} className="text-sm font-semibold text-marque hover:underline">
                  {t('Tout marquer comme lu')}
                </button>
              )}
            </div>
            {donnees?.notifications.length === 0 && <p className="px-4 py-10 text-center text-sm text-encre-doux">{t('Aucune notification pour l’instant.')}</p>}
            <ul className="max-h-[420px] divide-y divide-trait overflow-y-auto">
              {donnees?.notifications.map((n) => {
                const [Icone, ton] = ICONES[n.type] ?? [Bell, 'bg-or-50 text-marque']
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => ouvrir(n)} className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-fond ${n.lu ? '' : 'bg-or-50/50'}`}>
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ton}`}>
                        <Icone className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.lu ? 'text-encre' : 'font-semibold text-ardoise'}`}>{n.titre}</span>
                        {n.message && <span className="mt-0.5 line-clamp-2 block text-[13px] text-encre-doux">{n.message}</span>}
                        <span className="mt-1 block text-xs text-encre-pale">{ilYa(n.created_at)}</span>
                      </span>
                      {!n.lu && <span className="mt-2 h-2 w-2 shrink-0 rounded-[2px] bg-marque" aria-label="Non lue" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Notifications en temps réel : écoute du flux SSE de l'API (fetch + lecture en continu, pour
// pouvoir envoyer le jeton dans l'en-tête). Reconnexion automatique après une coupure.
import { useEffect, useRef } from 'react'
import { renouveler, session } from '../api/axiosConfig'
import { listerNotifications } from '../api'

const ATTENTE_MS = 5000

export function useFluxNotifications(surNotification) {
  const rappel = useRef(surNotification)
  rappel.current = surNotification

  useEffect(() => {
    if (typeof window.ReadableStream === 'undefined' || typeof window.TextDecoderStream === 'undefined') return undefined
    let actif = true
    let controleur = null
    let minuterie = null

    const ecouter = async () => {
      if (!actif || !session.lire()) return
      controleur = new AbortController()
      try {
        const jeton = session.jeton() ?? (await renouveler())
        const r = await fetch('/api/notifications/flux', {
          headers: { Authorization: `Bearer ${jeton}`, Accept: 'text/event-stream' },
          signal: controleur.signal,
        })
        // jeton expiré : un appel ordinaire le fait renouveler par l'intercepteur, puis on se reconnecte
        if (r.status === 401) await listerNotifications({ limit: 1 }).catch(() => {})
        if (r.ok && r.body) {
          const lecteur = r.body.pipeThrough(new TextDecoderStream()).getReader()
          let tampon = ''
          for (;;) {
            const { value, done } = await lecteur.read()
            if (done) break
            tampon += value
            let fin
            while ((fin = tampon.indexOf('\n\n')) >= 0) {
              const bloc = tampon.slice(0, fin)
              tampon = tampon.slice(fin + 2)
              const donnee = bloc.split('\n').find((l) => l.startsWith('data: '))
              if (bloc.startsWith('event: notification') && donnee) {
                try {
                  rappel.current(JSON.parse(donnee.slice(6)))
                } catch {
                  /* événement illisible : ignoré */
                }
              }
            }
          }
        }
      } catch {
        /* coupure réseau ou arrêt volontaire */
      }
      if (actif) minuterie = setTimeout(ecouter, ATTENTE_MS)
    }

    ecouter()
    return () => {
      actif = false
      controleur?.abort()
      clearTimeout(minuterie)
    }
  }, [])
}

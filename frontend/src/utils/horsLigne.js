// Mode hors ligne du chauffeur : dans les quartiers mal couverts, un point marqué sans réseau est gardé
// sur le téléphone puis envoyé au retour de la connexion. La dernière version de chaque tournée est
// aussi gardée pour pouvoir la rouvrir sans réseau.
import { marquerPoint } from '../api'

const CLE_FILE = 'tanana-madio-points-en-attente'
const cleTournee = (id) => `tanana-madio-tournee-${id}`

function lire(cle, defaut) {
  try {
    return JSON.parse(localStorage.getItem(cle)) ?? defaut
  } catch {
    return defaut
  }
}
function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur))
  } catch {
    /* stockage plein ou bloqué : on continue sans copie locale */
  }
}

// erreur réseau (pas de réponse du serveur), à distinguer d'un refus de l'API
export const erreurReseau = (err) => !err?.response

export const pointsEnAttente = (collecteId) => lire(CLE_FILE, []).filter((p) => !collecteId || p.collecteId === collecteId)

export function mettreEnAttente(collecteId, signalementId) {
  const file = lire(CLE_FILE, [])
  if (!file.some((p) => p.collecteId === collecteId && p.signalementId === signalementId)) {
    file.push({ collecteId, signalementId, le: new Date().toISOString() })
    ecrire(CLE_FILE, file)
  }
}

// Envoie la file dans l'ordre ; s'arrête à la première coupure réseau.
// Un point déjà collecté côté serveur (409) est considéré comme envoyé.
export async function synchroniser() {
  let envoyes = 0
  const refuses = []
  for (const p of lire(CLE_FILE, [])) {
    try {
      await marquerPoint(p.collecteId, p.signalementId)
      envoyes += 1
    } catch (err) {
      if (erreurReseau(err)) break
      if (err.response?.data?.code !== 'POINT_DEJA_COLLECTE') refuses.push(p)
      else envoyes += 1
    }
    ecrire(
      CLE_FILE,
      lire(CLE_FILE, []).filter((x) => !(x.collecteId === p.collecteId && x.signalementId === p.signalementId)),
    )
  }
  return { envoyes, refuses, restants: lire(CLE_FILE, []).length }
}

export const garderTournee = (c) => ecrire(cleTournee(c.id), c)
export const tourneeGardee = (id) => lire(cleTournee(id), null)

// Applique sur la tournée les points marqués mais pas encore envoyés
export function avecPointsEnAttente(c) {
  if (!c) return c
  const attente = new Set(pointsEnAttente(c.id).map((p) => p.signalementId))
  if (!attente.size) return c
  const signalements = c.signalements.map((s) => (attente.has(s.id) ? { ...s, collecte_fait: true, en_attente_envoi: true } : s))
  return { ...c, signalements, nb_faits: signalements.filter((s) => s.collecte_fait).length }
}

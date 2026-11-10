// Appels à l'API regroupés par ressource
import api from './axiosConfig'

const donnees = (r) => r.data

// ── Authentification
export const connexion = (email, mot_de_passe) => api.post('/auth/login', { email, mot_de_passe }).then(donnees)
export const inscription = (champs) => api.post('/auth/register', champs).then(donnees)
export const deconnexion = (refreshToken) => api.post('/auth/logout', { refreshToken })
export const profil = () => api.get('/auth/profil').then(donnees)
export const changerMotDePasse = (ancien, nouveau) => api.patch('/auth/mot-de-passe', { ancien, nouveau }).then(donnees)

// ── Signalements
export const listerSignalements = (params) => api.get('/signalements', { params }).then(donnees)
export const carteSignalements = (params) => api.get('/signalements/carte', { params }).then((r) => r.data.signalements)
export const mesSignalements = (params) => api.get('/signalements/mes', { params }).then(donnees)
export const supprimerSignalement = (id) => api.delete(`/signalements/${id}`)
export const changerStatut = (id, statut) => api.patch(`/signalements/${id}/statut`, { statut }).then(donnees)

// multipart/form-data : la photo part avec les champs, progression d'envoi suivie
export function envoyerSignalement(champs, photo, surProgression) {
  const formulaire = new FormData()
  for (const [cle, valeur] of Object.entries(champs)) if (valeur != null && valeur !== '') formulaire.append(cle, valeur)
  if (photo) formulaire.append('photo', photo)
  return api
    .post('/signalements', formulaire, {
      timeout: 120000,
      onUploadProgress: (e) => e.total && surProgression?.(Math.round((e.loaded / e.total) * 100)),
    })
    .then(donnees)
}

// ── Collectes
export const listerCollectes = (params) => api.get('/collectes', { params }).then(donnees)
export const collecte = (id) => api.get(`/collectes/${id}`).then(donnees)
export const optimiser = (signalement_ids, camion_id) => api.post('/collectes/optimiser', { signalement_ids, camion_id }).then(donnees)
export const suggestion = (camion_id, zone_id) => api.post('/collectes/suggestion', { camion_id, zone_id }).then(donnees)
export const creerCollecte = (champs) => api.post('/collectes', champs).then(donnees)
export const demarrerCollecte = (id) => api.patch(`/collectes/${id}/demarrer`).then(donnees)
export const marquerPoint = (id, sid) => api.patch(`/collectes/${id}/signalements/${sid}`).then(donnees)
export const terminerCollecte = (id, champs) => api.patch(`/collectes/${id}/terminer`, champs).then(donnees)
export const annulerCollecte = (id) => api.patch(`/collectes/${id}/annuler`).then(donnees)

// ── Camions
export const listerCamions = (params) => api.get('/camions', { params }).then((r) => r.data.camions)
export const creerCamion = (champs) => api.post('/camions', champs).then(donnees)
export const modifierCamion = (id, champs) => api.put(`/camions/${id}`, champs).then(donnees)
export const supprimerCamion = (id) => api.delete(`/camions/${id}`)

// ── Zones
export const listerZones = () => api.get('/zones').then((r) => r.data.zones)
export const creerZone = (champs) => api.post('/zones', champs).then(donnees)
export const modifierZone = (id, champs) => api.put(`/zones/${id}`, champs).then(donnees)
export const supprimerZone = (id) => api.delete(`/zones/${id}`)

// ── Statistiques
export const tableauDeBord = () => api.get('/stats/dashboard').then(donnees)
export const statsZones = () => api.get('/stats/zones').then((r) => r.data.zones)
export const statsPeriode = (params) => api.get('/stats/periode', { params }).then(donnees)
export const apercuPublic = () => api.get('/stats/public').then(donnees)

// ── Utilisateurs (administration)
export const listerUtilisateurs = (params) => api.get('/utilisateurs', { params }).then(donnees)
export const creerUtilisateur = (champs) => api.post('/utilisateurs', champs).then(donnees)
export const modifierUtilisateur = (id, champs) => api.put(`/utilisateurs/${id}`, champs).then(donnees)
export const activerUtilisateur = (id, actif) => api.patch(`/utilisateurs/${id}/activer`, { actif }).then(donnees)
export const journal = (params) => api.get('/utilisateurs/journal', { params }).then(donnees)

// ── Notifications
export const listerNotifications = (params) => api.get('/notifications', { params }).then(donnees)
export const lireNotification = (id) => api.patch(`/notifications/${id}/lu`)
export const toutLire = () => api.patch('/notifications/tout-lu')

// ── Exports CSV (téléchargement avec le jeton : le fichier est reçu puis enregistré par le navigateur)
export async function telechargerCsv(ressource, params) {
  const r = await api.get(`/exports/${ressource}.csv`, { params, responseType: 'blob', timeout: 120000 })
  const nom = /filename="([^"]+)"/.exec(r.headers['content-disposition'] ?? '')?.[1] ?? `${ressource}.csv`
  const lien = document.createElement('a')
  lien.href = URL.createObjectURL(r.data)
  lien.download = nom
  lien.click()
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000)
  return nom
}

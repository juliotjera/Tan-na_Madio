// Application Android (Capacitor) ou site web : le même code.
// Dans l'application, l'interface est dans l'APK et parle au serveur en ligne ; sur le site,
// l'interface est servie par l'API elle-même et les adresses restent relatives (/api, /uploads).
import { Capacitor } from '@capacitor/core'

export const natif = Capacitor.isNativePlatform()
export const SERVEUR = natif ? import.meta.env.VITE_SERVEUR || 'https://tanana-madio.onrender.com' : ''

// /uploads/photo.jpg → adresse complète dans l'application ; inchangé sur le site
export const urlServeur = (chemin) => (chemin?.startsWith('/') ? SERVEUR + chemin : chemin)

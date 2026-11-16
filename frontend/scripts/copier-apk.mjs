// Après « npm run android:release » : copie l'APK signé dans android/sortie/ sous un nom stable
// (tanana-madio.apk), celui attendu par le lien de téléchargement (GitHub Releases).
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs'

const sortie = new URL('../android/sortie/', import.meta.url)
mkdirSync(sortie, { recursive: true })
const source = new URL('../android/app/build/outputs/apk/release/app-release.apk', import.meta.url)
if (!existsSync(source)) {
  console.log('✖ app-release.apk introuvable : la compilation a-t-elle échoué ?')
  process.exit(1)
}
if (!existsSync(new URL('../android/signature.properties', import.meta.url))) {
  console.log('✖ android/signature.properties manquant : l’APK n’est pas signé, Android refusera de l’installer')
  process.exit(1)
}
copyFileSync(source, new URL('tanana-madio.apk', sortie))
console.log(`✔ tanana-madio.apk (${Math.round(statSync(source).size / 1024)} Ko) → android/sortie/`)

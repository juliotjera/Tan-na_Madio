// QR code de téléchargement de l'application Android (accueil, version ordinateur).
//   node scripts/qr-android.mjs   → public/android-qr.svg
import { writeFile } from 'node:fs/promises'
import QRCode from 'qrcode'

const ADRESSE = 'https://tanana-madio.onrender.com/telecharger/tanana-madio.apk'
const svg = await QRCode.toString(ADRESSE, { type: 'svg', errorCorrectionLevel: 'M', margin: 2, color: { dark: '#111820', light: '#ffffff' } })
await writeFile(new URL('../public/android-qr.svg', import.meta.url), svg)
console.log('public/android-qr.svg →', ADRESSE)

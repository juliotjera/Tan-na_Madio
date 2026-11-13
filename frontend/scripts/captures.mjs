// Captures d'écran pour la présentation du projet (portfolio, rapport).
//   node scripts/captures.mjs http://localhost:3001 <dossier de sortie>
// L'API doit tourner avec les données de démonstration (mot de passe de démo local).
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:3001'
const SORTIE = process.argv[3] ?? 'captures'
const MDP = process.env.DEMO_MOT_DE_PASSE ?? 'Admin2025!'

async function connecter(page, email) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MDP)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.waitForURL((u) => !u.pathname.startsWith('/login'))
}
const pause = (page, ms = 2500) => page.waitForTimeout(ms)
// attend que les messages « Bonjour … » aient disparu et que les fonds de carte soient chargés
async function pret(page) {
  await page.waitForTimeout(4500)
  await page.waitForFunction(() => {
    const tuiles = document.querySelectorAll('.leaflet-tile')
    return [...tuiles].every((t) => t.complete) && document.querySelectorAll('.leaflet-tile-loaded').length >= Math.min(4, tuiles.length)
  }, null, { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(800)
}

const navigateur = await chromium.launch()

// Ordinateur : accueil et tableau de bord de l'administrateur
const bureau = await navigateur.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR' })
let page = await bureau.newPage()
await page.goto(BASE)
await pause(page, 4000)
await page.screenshot({ path: `${SORTIE}/bureau-accueil.png` })
await connecter(page, 'admin@tananamadio.mg')
await pret(page)
await page.screenshot({ path: `${SORTIE}/bureau-admin.png` })
await bureau.close()

// Téléphone : tournée du chauffeur et espace citoyen
const telephone = await navigateur.newContext({ ...devices['iPhone 13'], locale: 'fr-FR', geolocation: { latitude: -18.9137, longitude: 47.5361 }, permissions: ['geolocation'] })
page = await telephone.newPage()
await connecter(page, 'chauffeur@tananamadio.mg')
await page.goto(`${BASE}/chauffeur/tournees`)
await pause(page)
await page.locator('a[href^="/chauffeur/tournees/"]').first().click()
await pret(page)
await page.evaluate(() => window.scrollTo(0, 190))
await pause(page, 1200)
await page.screenshot({ path: `${SORTIE}/tel-chauffeur.png` })
await page.getByRole('button', { name: 'Se déconnecter' }).click()
await connecter(page, 'citoyen@tananamadio.mg')
await pret(page)
await page.goto(`${BASE}/citoyen/signalements`)
await pause(page, 3500)
await page.screenshot({ path: `${SORTIE}/tel-citoyen.png` })
await telephone.close()

await navigateur.close()
console.log('captures prêtes dans', SORTIE)

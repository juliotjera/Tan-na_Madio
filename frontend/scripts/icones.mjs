// Génère les icônes PNG de l'application à partir de public/logo/icone-app.svg (Chromium de Playwright).
//   node scripts/icones.mjs
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile(new URL('../public/logo/icone-app.svg', import.meta.url), 'utf8')
const SORTIES = [
  ['public/icons/icon-512.png', 512],
  ['public/icons/icon-192.png', 192],
  ['public/icons/apple-touch-icon.png', 180],
  ['public/icons/favicon-48.png', 48],
  ['public/icons/favicon-32.png', 32],
  ['public/icons/favicon-16.png', 16],
]

const navigateur = await chromium.launch()
const page = await navigateur.newPage()
for (const [chemin, taille] of SORTIES) {
  await page.setViewportSize({ width: taille, height: taille })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg style="width:${taille}px;height:${taille}px;display:block" `)}</body></html>`)
  await page.screenshot({ path: new URL(`../${chemin}`, import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: true })
  console.log(chemin, taille)
}
// Application Android : épingle dorée seule (fond transparent), source de @capacitor/assets
// qui pose le fond anthracite (icônes adaptatives et écran de démarrage) : npm run android:icones
// (réduite à 86 % pour que la pointe ne soit pas coupée par les masques ronds d'Android)
const epingle = svg.replace(/<path fill="#111820"[^>]*\/>/, '').replace(/<metadata>.*<\/metadata>/s, '')
await page.setViewportSize({ width: 1024, height: 1024 })
await page.setContent(`<html><body style="margin:0;background:transparent">${epingle.replace('<svg ', '<svg style="width:1024px;height:1024px;display:block;transform:scale(0.86)" ')}</body></html>`)
await page.screenshot({ path: new URL('../assets/logo.png', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'), omitBackground: true })
console.log('assets/logo.png', 1024)
await navigateur.close()

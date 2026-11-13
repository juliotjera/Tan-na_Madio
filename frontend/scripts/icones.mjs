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
await navigateur.close()

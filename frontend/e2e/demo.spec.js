// Vidéo de démonstration (npm run demo) : un parcours complet, ralenti, enregistré en 1280 × 720.
// La vidéo est écrite dans test-results/ ; copiez-la dans docs/demo/ pour la garder.
import { expect, test } from '@playwright/test'
import { CENTRE_ANALAKELY, connecter } from './aide'

test.use({ geolocation: CENTRE_ANALAKELY, permissions: ['geolocation'] })
test.setTimeout(240_000)

const pause = (page, ms = 1200) => page.waitForTimeout(ms)
async function defiler(page, fois = 4) {
  for (let i = 0; i < fois; i++) {
    await page.mouse.wheel(0, 450)
    await pause(page, 700)
  }
}

test('démonstration : du signalement au ramassage', async ({ page }) => {
  // Accueil
  await page.goto('/')
  await pause(page, 3000)
  await defiler(page, 6)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await pause(page)

  // Citoyen : signalement
  await connecter(page, 'citoyen@tananamadio.mg')
  await pause(page, 1500)
  await defiler(page, 3)
  await page.goto('/citoyen/signaler')
  await page.locator('textarea').first().fill('Sacs d’ordures déposés près de l’arrêt de bus')
  await page.getByLabel("Niveau d'urgence").selectOption('eleve')
  await pause(page, 1500)
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByRole('heading', { name: 'Signalement envoyé' })).toBeVisible()
  await pause(page, 2000)
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  // Agent : validation
  await connecter(page, 'agent@tananamadio.mg')
  await pause(page, 2500)
  await page.goto('/agent/signalements')
  await pause(page, 2000)
  await page.locator('li').filter({ hasText: 'arrêt de bus' }).getByRole('button', { name: 'Valider' }).click()
  await pause(page, 2000)
  await page.goto('/agent/collectes')
  await pause(page, 2000)
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  // Chauffeur : tournée sur les vraies rues
  await connecter(page, 'chauffeur@tananamadio.mg')
  await pause(page, 1500)
  await page.goto('/chauffeur/tournees')
  await page.locator('a[href^="/chauffeur/tournees/"]').first().click()
  await pause(page, 3000)
  await page.getByRole('button', { name: 'Démarrer la tournée' }).click()
  await pause(page, 1500)
  const marquer = page.getByRole('button', { name: 'Marquer', exact: true })
  for (let i = 0; i < 2 && (await marquer.count()) > 0; i++) {
    await marquer.first().click()
    await pause(page, 1500)
  }
  await page.getByRole('button', { name: 'Se déconnecter' }).click()

  // Administration
  await connecter(page, 'admin@tananamadio.mg')
  await pause(page, 2500)
  await defiler(page, 3)
  await page.goto('/admin/stats')
  await pause(page, 2000)
  await defiler(page, 4)
  await pause(page, 1500)
})

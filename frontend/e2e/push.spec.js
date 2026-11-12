// Service worker (hors ligne et notifications push) : installé sur la version compilée, réglage visible.
// Le Chromium automatisé n'a pas de service de notifications : l'abonnement lui-même est vérifié
// par les tests de l'API (tests/notification.test.js) et à la main sur un téléphone.
import { expect, test } from '@playwright/test'
import { connecter } from './aide'

test('le service worker s’installe et le réglage des notifications est proposé', async ({ page }) => {
  await connecter(page, 'chauffeur@tananamadio.mg')
  const actif = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => Boolean(r.active)))
  expect(actif).toBe(true)
  await page.goto('/compte')
  await expect(page.locator('section').filter({ hasText: 'Notifications sur ce téléphone' })).toBeVisible()
})

test('hors connexion, l’application s’ouvre encore (page et fichiers en cache)', async ({ page, context }) => {
  await connecter(page, 'chauffeur@tananamadio.mg')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload() // la page est désormais servie et gardée par le service worker
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('Tanàna Madio').first()).toBeVisible()
  await context.setOffline(false)
})

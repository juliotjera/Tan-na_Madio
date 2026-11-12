// Sur téléphone : pas de débordement horizontal, navigation du bas, barre d'action du chauffeur
import { expect, test } from '@playwright/test'
import { connecter } from './aide'

const deborde = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)

test('accueil et connexion tiennent dans la largeur du téléphone', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'La ville propre de demain' })).toBeVisible()
  expect(await deborde(page)).toBe(false)
  await page.goto('/login')
  expect(await deborde(page)).toBe(false)
})

test('citoyen : navigation du bas jusqu’au formulaire de signalement', async ({ page }) => {
  await connecter(page, 'citoyen@tananamadio.mg')
  await page.getByRole('navigation', { name: 'Raccourcis' }).getByRole('link', { name: 'Signaler' }).click()
  await expect(page.getByRole('heading', { name: 'Signaler un problème' })).toBeVisible()
  expect(await deborde(page)).toBe(false)
})

test('chauffeur : le détail d’une tournée tient dans l’écran', async ({ page }) => {
  await connecter(page, 'chauffeur@tananamadio.mg')
  await page.goto('/chauffeur/tournees')
  const lien = page.locator('a[href^="/chauffeur/tournees/"]').first()
  await lien.click()
  await expect(page.getByRole('heading', { name: 'Détail de la tournée' })).toBeVisible()
  expect(await deborde(page)).toBe(false)
})

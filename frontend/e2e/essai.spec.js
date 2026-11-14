// « Essayer sans compte » : un clic sur un rôle ouvre son espace, sans saisir de mot de passe
import { expect, test } from '@playwright/test'

test('un visiteur ouvre l’espace administrateur en un clic', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Essayer sans compte')).toBeVisible()
  await page.getByRole('button', { name: 'Administrateur', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'Tableau de bord administrateur' })).toBeVisible()
})

test('un visiteur ouvre la tournée du chauffeur en un clic', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Chauffeur', exact: true }).click()
  await expect(page).toHaveURL(/\/chauffeur$/)
  await expect(page.getByText('Tournée du jour')).toBeVisible()
})

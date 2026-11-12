// Outils communs aux tests de bout en bout
import { expect } from '@playwright/test'

export const MOT_DE_PASSE = 'Admin2025!' // comptes de démonstration (voir README)
export const CENTRE_ANALAKELY = { latitude: -18.9137, longitude: 47.5361 }

export async function connecter(page, email) {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login/)
}

export async function deconnecter(page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await expect(page).toHaveURL(/\/(login)?$/)
}

// Connexion et inscription sur une seule page : le volet (ordinateur) fait passer de l'une à l'autre
import { expect, test } from '@playwright/test'

test('le volet passe de la connexion à l’inscription et revient, l’adresse suit', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
  await page.getByRole('complementary').getByRole('button', { name: 'Créer un compte' }).click()
  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Créer un compte citoyen' })).toBeVisible()
  await expect(page.getByRole('complementary').getByText('Vous avez déjà un compte ?')).toBeVisible()
  // une fois le volet posé, un seul formulaire reste dans la page
  await expect(page.locator('form')).toHaveCount(1)
  await page.getByRole('complementary').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Se connecter' })).toBeVisible()
})

test('ce qui est déjà saisi est gardé quand on bascule', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Adresse e-mail').fill('quelquun@exemple.mg')
  await page.getByRole('complementary').getByRole('button', { name: 'Créer un compte' }).click()
  await expect(page).toHaveURL(/\/register$/)
  await page.getByRole('complementary').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.locator('form')).toHaveCount(1) // fin du glissement
  await expect(page.getByLabel('Adresse e-mail')).toHaveValue('quelquun@exemple.mg')
})

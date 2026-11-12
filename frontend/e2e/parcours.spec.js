// Parcours complet, du signalement au ramassage, avec les quatre rôles
import { expect, test } from '@playwright/test'
import { CENTRE_ANALAKELY, connecter } from './aide'

test.describe.configure({ mode: 'serial' })
test.use({ geolocation: CENTRE_ANALAKELY, permissions: ['geolocation'] })

test('accueil public : carte animée, parcours en trois étapes, inscription', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'La ville propre de demain' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Du signalement au ramassage' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Le camion ramasse' })).toBeVisible()
  await page.getByRole('link', { name: "S'inscrire" }).click()
  await expect(page).toHaveURL(/\/register/)
})

test('citoyen : signale un dépôt avec sa position GPS et gagne des points', async ({ page }) => {
  await connecter(page, 'citoyen@tananamadio.mg')
  await expect(page.getByRole('heading', { name: 'Mon Espace Citoyen' })).toBeVisible()
  await page.goto('/citoyen/signaler')
  await page.locator('textarea').first().fill('Tas de sacs au coin de la rue, test de bout en bout')
  // position GPS fournie par le navigateur
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue(/-18\.91/)
  await page.getByRole('button', { name: 'Envoyer' }).click()
  await expect(page.getByRole('heading', { name: 'Signalement envoyé' })).toBeVisible()
  await expect(page.getByText('+2 points')).toBeVisible()
})

test('agent : valide le signalement, puis le voit dans les validés', async ({ page }) => {
  await connecter(page, 'agent@tananamadio.mg')
  await page.goto('/agent/signalements')
  const carte = page.locator('li').filter({ hasText: 'test de bout en bout' })
  await expect(carte).toBeVisible()
  await carte.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('Signalement validé')).toBeVisible()
  await page.getByRole('radio', { name: 'Validés' }).click()
  await expect(page.locator('li').filter({ hasText: 'test de bout en bout' })).toBeVisible()
})

test('agent : rejette un signalement avec un motif', async ({ page }) => {
  await connecter(page, 'agent@tananamadio.mg')
  await page.goto('/agent/signalements')
  await page.getByRole('button', { name: 'Rejeter' }).first().click()
  const fenetre = page.getByRole('dialog', { name: 'Rejeter le signalement' })
  await fenetre.getByText('Dépôt déjà ramassé').click()
  await fenetre.getByRole('button', { name: 'Rejeter' }).click()
  await expect(page.getByText('Signalement rejeté')).toBeVisible()
})

test('chauffeur : démarre sa tournée, ramasse chaque point et la termine', async ({ page }) => {
  await connecter(page, 'chauffeur@tananamadio.mg')
  await page.goto('/chauffeur/tournees')
  await page.locator('a[href^="/chauffeur/tournees/"]').first().click()
  await expect(page.getByRole('heading', { name: 'Détail de la tournée' })).toBeVisible()
  await page.getByRole('button', { name: 'Démarrer la tournée' }).click()
  await expect(page.getByText('Tournée démarrée')).toBeVisible()

  const marquer = page.getByRole('button', { name: 'Marquer', exact: true })
  while ((await marquer.count()) > 0) {
    const avant = await marquer.count()
    await marquer.first().click()
    await expect(marquer).toHaveCount(avant - 1)
  }
  await expect(page.getByText('Tous les points collectés')).toBeVisible()
  await page.getByRole('button', { name: 'Terminer la tournée' }).click()
  await page.getByRole('dialog').getByLabel('Poids collecté (kg)').fill('850')
  await page.getByRole('dialog').getByRole('button', { name: 'Terminer', exact: true }).click()
  await expect(page.getByText('Tournée terminée').first()).toBeVisible()
})

test('administrateur : tableau de bord, statistiques et journal à jour', async ({ page }) => {
  await connecter(page, 'admin@tananamadio.mg')
  await expect(page.getByRole('heading', { name: 'Tableau de bord administrateur' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Priorités du moment' })).toBeVisible()
  await page.goto('/admin/stats')
  await expect(page.getByRole('heading', { name: 'Points noirs' })).toBeVisible()
  await page.goto('/admin/journal')
  await expect(page.getByRole('cell', { name: 'Tournée terminée' }).first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Point collecté' }).first()).toBeVisible()
})

test('session : la page rechargée reste connectée (cookie de renouvellement)', async ({ page }) => {
  await connecter(page, 'admin@tananamadio.mg')
  await page.goto('/admin/utilisateurs')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Gestion des Utilisateurs' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('tanana-madio-session'))).not.toMatch(/token/i)
})

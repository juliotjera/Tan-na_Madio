// Tests de bout en bout : les vrais parcours dans un navigateur, sur l'interface compilée
// servie par l'API (base de démonstration neuve à chaque lancement).
//   npm run build && npm run e2e
import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // un seul jeu de données partagé : les parcours s'enchaînent dans l'ordre
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'fr-FR',
    timezoneId: 'Indian/Antananarivo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } }, testIgnore: /telephone|demo/ },
    { name: 'telephone', use: { ...devices['Pixel 7'] }, testMatch: /telephone/ },
    // vidéo de démonstration : npx playwright test --project=demo
    { name: 'demo', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 }, video: { mode: 'on', size: { width: 1280, height: 720 } }, launchOptions: { slowMo: 350 } }, testMatch: /demo/ },
  ],
  webServer: {
    command: 'node ../backend/scripts/serveurE2E.js',
    url: `http://localhost:${PORT}/api/sante`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
})

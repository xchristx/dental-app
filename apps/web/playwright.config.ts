import { defineConfig } from '@playwright/test'

// Pruebas de punta a punta contra el Supabase local (pnpm db:start).
// Cada archivo reinicia la base con el seed antes de empezar, así que corren
// de a uno: comparten la misma base.
const PUERTO = 3100
const URL_APP = process.env.E2E_URL ?? `http://localhost:${PUERTO}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: URL_APP,
    // El Chrome instalado: en las imágenes de GitHub Actions ya viene.
    channel: 'chrome',
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Sin E2E_URL, compila la web y la levanta. Si ya hay un servidor en el
  // puerto (por ejemplo `pnpm dev --port 3100`), lo usa.
  webServer: process.env.E2E_URL
    ? undefined
    : {
        command: `pnpm build && pnpm start --port ${PUERTO}`,
        url: `${URL_APP}/entrar`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
})

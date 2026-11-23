import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

// Genera la guía de uso en PDF (docs/guia/guia-sifel.pdf) con capturas del
// Supabase local y el seed, que son datos inventados. Se corre con
// `pnpm --filter @dental/web guia` y `pnpm db:start` levantado.
//
// La app se compila como en producción (sin la franja de demo y con el botón
// de Google), en otra carpeta y otro puerto para no pisar la de los e2e.
const PUERTO = 4174

export default defineConfig({
  testDir: '.',
  testMatch: 'generar.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: 'chrome',
    locale: 'es-BO',
    timezoneId: 'America/La_Paz',
    actionTimeout: 10_000,
  },
  webServer: {
    command: `pnpm exec vite build --outDir dist-guia && pnpm exec vite preview --outDir dist-guia --port ${PUERTO} --strictPort`,
    // Se compila desde apps/web, no desde esta carpeta.
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    url: `http://localhost:${PUERTO}/entrar`,
    reuseExistingServer: false,
    timeout: 240_000,
    // Las variables del proceso le ganan a .env.local.
    env: { VITE_ES_DEMO: 'false', VITE_GOOGLE_HABILITADO: 'true' },
  },
})

// La app se puede instalar en el celular. Usa el protocolo de Chrome (CDP).
import { expect, test } from '@playwright/test'
import { CELULAR } from './apoyo/pagina'

test('Chrome lee el manifiesto y considera la app instalable', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await page.goto('/entrar')
  const cdp = await page.context().newCDPSession(page)
  const manifiesto = await cdp.send('Page.getAppManifest')
  expect(manifiesto.errors).toEqual([])
  expect(JSON.parse(manifiesto.data ?? '{}')).toMatchObject({
    short_name: 'Sifel',
    start_url: '/',
    display: 'standalone',
  })
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
  // Playwright abre contextos de incógnito, donde Chrome nunca deja instalar.
  expect(installabilityErrors.filter((e) => e.errorId !== 'in-incognito')).toEqual([])
})

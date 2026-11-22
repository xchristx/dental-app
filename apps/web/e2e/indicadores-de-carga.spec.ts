// Si el servidor tarda (la primera vez, o con mala señal), la app muestra que
// está cargando en vez de parecer congelada. Las respuestas se retrasan a
// propósito con page.route. Solo lee datos.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo, rangoSemana } from './apoyo/fechas'
import { CELULAR, control, entrarComoDemo, principal, tituloAgenda } from './apoyo/pagina'

test.beforeAll(reiniciarBase)

/** Retrasa 2 s las respuestas de Next (RSC) cuya URL cumpla `cumple`, incluida la precarga. */
async function retrasar(page: Page, cumple: (url: URL) => boolean) {
  await page.route(
    (url) => url.searchParams.has('_rsc') && cumple(url),
    async (ruta) => {
      await new Promise((r) => setTimeout(r, 2000))
      await ruta.fallback()
    },
  )
}

test('celular: una sección que tarda muestra un indicador en su botón', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await retrasar(page, (url) => url.pathname === '/pacientes')
  await entrarComoDemo(page)
  const enlace = page.locator('a[href="/pacientes"]').filter({ visible: true })
  await enlace.click()
  await expect(enlace.locator('progress')).toBeVisible()
  await expect(page).toHaveURL('/pacientes', { timeout: 15_000 })
  await expect(enlace.locator('progress')).toHaveCount(0)
  await expect(page.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeVisible()
})

test('escritorio: cambiar de semana muestra la carga y atenúa la semana anterior', async ({
  page,
}) => {
  await entrarComoDemo(page)
  await retrasar(page, (url) => url.searchParams.has('fecha'))
  await control(page, 'Semana siguiente').click()

  const estado = principal(page).getByRole('status')
  await expect(estado).toHaveText('Cargando la semana…')
  await expect(page.locator('h1 progress').filter({ visible: true })).toHaveCount(1)
  await expect(page.locator(`section[aria-label="${diaLargo(dia(0))}"]`).locator('..')).toHaveClass(
    /opacity-50/,
  )

  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(7)), { timeout: 15_000 })
  await expect(estado).toHaveText('')
  await expect(page.locator('h1 progress')).toHaveCount(0)
})

test('celular: del domingo al lunes también muestra la carga', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page, `/?fecha=${dia(6)}`)
  await retrasar(page, (url) => url.searchParams.get('fecha') === dia(7))
  await control(page, 'Día siguiente').click()
  await expect(principal(page).getByRole('status')).toHaveText('Cargando la semana…')
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(7)), { timeout: 15_000 })
  await expect(principal(page).getByRole('status')).toHaveText('')
})

test('abrir la ficha de un paciente que tarda muestra un indicador en la fila', async ({
  page,
}) => {
  await retrasar(page, (url) => url.pathname.startsWith('/pacientes/'))
  await entrarComoDemo(page, '/pacientes')
  const fila = principal(page).locator('ul li a').filter({ hasText: 'Lucía Fernández' })
  await fila.click()
  await expect(fila.locator('progress')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Lucía Fernández' })).toBeVisible({
    timeout: 15_000,
  })
})

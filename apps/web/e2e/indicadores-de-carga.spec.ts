// Si los datos tardan (la primera vez, o con mala señal), la app muestra que
// está cargando en vez de parecer congelada. Las respuestas se retrasan a
// propósito con page.route. Solo lee datos.
//
// Sirve para la web con Next y para la SPA (0017): se retrasan los pedidos de
// Next (`_rsc`) y las consultas a Supabase, y "está cargando" es el indicador
// de carga o un esqueleto (aria-busy).
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo, rangoSemana } from './apoyo/fechas'
import { CELULAR, calendarioAgenda, entrarComoDemo, principal, tituloAgenda } from './apoyo/pagina'

test.beforeAll(reiniciarBase)

/**
 * Retrasa 2 s los pedidos de Next que cumplan `rsc` y las consultas a la
 * tabla `tabla` de Supabase.
 */
async function retrasar(page: Page, { rsc, tabla }: { rsc: (url: URL) => boolean; tabla: string }) {
  await page.route(
    (url) => (url.searchParams.has('_rsc') && rsc(url)) || url.pathname === `/rest/v1/${tabla}`,
    async (ruta) => {
      await new Promise((r) => setTimeout(r, 2000))
      await ruta.fallback()
    },
  )
}

/** El indicador de carga o un esqueleto, donde sea que aparezca. */
const cargando = (page: Page) =>
  page.locator('progress, [aria-busy=true]').filter({ visible: true }).first()

test('celular: una sección que tarda muestra que está cargando', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await retrasar(page, { rsc: (url) => url.pathname === '/pacientes', tabla: 'pacientes' })
  await entrarComoDemo(page)
  await page.locator('a[href="/pacientes"]').filter({ visible: true }).click()
  await expect(cargando(page)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(principal(page).locator('ul li a').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('progress, [aria-busy=true]').filter({ visible: true })).toHaveCount(0)
})

// La SPA precarga la semana anterior y la siguiente: ahí el cambio es
// instantáneo. Para ver la carga se salta tres semanas con el calendario.
test('escritorio: ir a otra semana muestra la carga y atenúa la semana anterior', async ({
  page,
}) => {
  await retrasar(page, { rsc: (url) => url.searchParams.has('fecha'), tabla: 'citas' })
  await entrarComoDemo(page)
  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(0)), { timeout: 15_000 })
  await calendarioAgenda(page).fill(dia(23))

  const estado = principal(page).getByRole('status')
  await expect(estado).toHaveText('Cargando la semana…')
  await expect(page.locator('h1 progress').filter({ visible: true })).toHaveCount(1)
  await expect(page.locator(`section[aria-label="${diaLargo(dia(0))}"]`).locator('..')).toHaveClass(
    /opacity-50/,
  )

  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(21)), { timeout: 15_000 })
  await expect(estado).toHaveText('')
  await expect(page.locator('h1 progress')).toHaveCount(0)
})

test('celular: ir a un día de otra semana también muestra la carga', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await retrasar(page, { rsc: (url) => url.searchParams.has('fecha'), tabla: 'citas' })
  await entrarComoDemo(page, `/?fecha=${dia(6)}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(6)), { timeout: 15_000 })
  await calendarioAgenda(page).fill(dia(22))
  await expect(principal(page).getByRole('status')).toHaveText('Cargando la semana…')
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(22)), { timeout: 15_000 })
  await expect(principal(page).getByRole('status')).toHaveText('')
})

test('abrir la ficha de un paciente que tarda muestra que está cargando', async ({ page }) => {
  await entrarComoDemo(page, '/pacientes')
  const fila = principal(page).locator('ul li a').filter({ hasText: 'Lucía Fernández' })
  await expect(fila).toBeVisible()
  await retrasar(page, { rsc: (url) => url.pathname.startsWith('/pacientes/'), tabla: 'pacientes' })
  await fila.click()
  await expect(cargando(page)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Lucía Fernández' })).toBeVisible({
    timeout: 15_000,
  })
})

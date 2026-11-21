// Cambiar de día dentro de la semana no va al servidor; cambiar de semana sí.
// La lista de pacientes se pide al abrir "Agendar". Solo lee datos.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo, hoy } from './apoyo/fechas'
import {
  CELULAR,
  buscarPaciente,
  citasVisibles,
  control,
  entrarComoDemo,
  hoja,
  tituloAgenda,
} from './apoyo/pagina'

test.beforeAll(reiniciarBase)

/** Pedidos al servidor (documentos, fetch y XHR) desde que se llama. */
function contarPedidos(page: Page) {
  const pedidos: string[] = []
  page.on('request', (r) => {
    if (['document', 'fetch', 'xhr'].includes(r.resourceType())) pedidos.push(r.url())
  })
  return pedidos
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(CELULAR)
})

test('pasar a otro día de la misma semana no va al servidor', async ({ page }) => {
  await entrarComoDemo(page, `/?fecha=${dia(1)}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(1)))
  const pedidos = contarPedidos(page)

  await control(page, 'Día siguiente').click()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(2)))
  await expect(page).toHaveURL(`/?fecha=${dia(2)}`)
  await expect(citasVisibles(page)).toHaveCount(2)
  await expect(citasVisibles(page).filter({ hasText: 'Sofía Céspedes' })).toHaveCount(1)
  await expect(citasVisibles(page).filter({ hasText: 'Diego Torrez' })).toHaveCount(1)

  await control(page, 'Día siguiente').click()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(3)))
  await page.goBack()
  await expect(tituloAgenda(page), '"atrás" vuelve al día anterior').toHaveText(diaLargo(dia(2)))
  expect(pedidos).toEqual([])
})

test('del domingo al lunes cambia de semana y trae sus citas', async ({ page }) => {
  await entrarComoDemo(page, `/?fecha=${dia(6)}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(6)))
  const pedidos = contarPedidos(page)
  await control(page, 'Día siguiente').click()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(7)))
  expect(pedidos.length).toBeGreaterThan(0)
})

test('"Hoy" lleva a hoy sin ir al servidor', async ({ page }) => {
  // Desde otro día de la semana: el miércoles, o el jueves si hoy es miércoles.
  const otro = dia(2) === hoy() ? dia(3) : dia(2)
  await entrarComoDemo(page, `/?fecha=${otro}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(otro))
  const pedidos = contarPedidos(page)
  await control(page.getByRole('navigation', { name: 'Cambiar de fecha' }), 'Hoy').click()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(hoy()))
  await expect(page).toHaveURL('/')
  expect(pedidos).toEqual([])
})

test('abrir "Agendar" pide la lista de pacientes y la búsqueda la usa', async ({ page }) => {
  await entrarComoDemo(page)
  const pedidos = contarPedidos(page)
  await control(page, 'Agendar').click()
  await expect(hoja(page)).toBeVisible()
  await expect.poll(() => pedidos.length).toBeGreaterThan(0)
  await buscarPaciente(hoja(page)).fill('luc fer')
  await expect(hoja(page).locator('ul li button')).toHaveText(['Lucía Fernández'])
})

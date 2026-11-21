// Tocar la fecha del título abre el calendario del sistema y lleva al día
// elegido, sin tocar las flechas una y otra vez. Solo lee datos.
//
// El calendario nativo no se puede manejar desde la prueba: se comprueba que
// el botón lo pide (showPicker) y se elige la fecha escribiéndola en el campo.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo, hoy, rangoSemana, sumarDias } from './apoyo/fechas'
import {
  CELULAR,
  calendarioAgenda,
  citasVisibles,
  contarPedidos,
  entrarComoDemo,
  tituloAgenda,
} from './apoyo/pagina'

test.beforeAll(reiniciarBase)

test.beforeEach(async ({ page }) => {
  // Cuenta las veces que se abre el calendario, sin abrirlo de verdad.
  await page.addInitScript(() => {
    const w = window as unknown as { calendariosAbiertos: number }
    w.calendariosAbiertos = 0
    HTMLInputElement.prototype.showPicker = function () {
      w.calendariosAbiertos++
    }
  })
})

const calendariosAbiertos = (page: Page) =>
  page.evaluate(() => (window as unknown as { calendariosAbiertos: number }).calendariosAbiertos)

test('celular: tocar la fecha abre el calendario', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page)
  const boton = page.getByRole('button', { name: diaLargo(hoy()), exact: true })
  await expect(boton).toHaveAccessibleDescription('Abre el calendario para ir a otra fecha.')
  await boton.click()
  expect(await calendariosAbiertos(page)).toBe(1)
  await expect(calendarioAgenda(page)).toHaveValue(hoy())
})

test('celular: un día lejano se abre de una vez y "atrás" vuelve', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page, `/?fecha=${dia(2)}`)
  const lejos = sumarDias(hoy(), 90)
  await calendarioAgenda(page).fill(lejos)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(lejos))
  await expect(page).toHaveURL(`/?fecha=${lejos}`)
  await expect(page.getByText('No tienes citas este día.')).toBeVisible()
  await page.goBack()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(2)))
})

test('celular: un día de la misma semana no va al servidor', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page, `/?fecha=${dia(0)}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(0)))
  const pedidos = contarPedidos(page)
  await calendarioAgenda(page).fill(dia(3))
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(3)))
  await expect(citasVisibles(page)).toHaveCount(3)
  expect(pedidos).toEqual([])
})

test('elegir hoy deja la URL sin fecha, como al entrar', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  const otro = sumarDias(hoy(), -30)
  await entrarComoDemo(page, `/?fecha=${otro}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(otro))
  await calendarioAgenda(page).fill(hoy())
  await expect(tituloAgenda(page)).toHaveText(diaLargo(hoy()))
  await expect(page).toHaveURL('/')
})

test('escritorio: el día elegido lleva a su semana', async ({ page }) => {
  await entrarComoDemo(page)
  await page.getByRole('button', { name: rangoSemana(dia(0)), exact: true }).click()
  expect(await calendariosAbiertos(page)).toBe(1)
  // Un miércoles cinco semanas más adelante.
  await calendarioAgenda(page).fill(dia(37))
  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(35)))
  await expect(citasVisibles(page)).toHaveCount(0)
})

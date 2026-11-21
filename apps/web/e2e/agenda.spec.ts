// La agenda muestra las citas del seed. Solo lee datos.
import { expect, test } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo, hoy, rangoSemana } from './apoyo/fechas'
import {
  CELULAR,
  citasVisibles,
  control,
  entrarComoDemo,
  principal,
  tituloAgenda,
} from './apoyo/pagina'

test.beforeAll(reiniciarBase)

test('escritorio: la semana actual con todas sus citas', async ({ page }) => {
  await entrarComoDemo(page)
  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(0)))
  await expect(citasVisibles(page)).toHaveCount(12)
  const main = principal(page)
  await expect(main).toContainText('Trámite en el banco')
  await expect(main).toContainText('Bloqueo · Consultorio')
  await expect(main, 'muestra a la socia en su cita').toContainText('Dra. Rocío Paz')
  await expect(main, 'muestra la llegada de una cita atendida').toContainText('Llegó 25 min tarde')
  await expect(main).toContainText('Cancelada')
})

test('escritorio: semana siguiente y vuelta a hoy', async ({ page }) => {
  await entrarComoDemo(page)
  await control(page, 'Semana siguiente').click()
  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(7)))
  await expect(citasVisibles(page)).toHaveCount(0)
  await control(page, 'Hoy').click()
  await expect(tituloAgenda(page)).toHaveText(rangoSemana(dia(0)))
  await expect(citasVisibles(page)).toHaveCount(12)
})

test('celular: un día, el anterior y un día sin citas', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page, `/?fecha=${dia(3)}`)
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(3)))
  await expect(citasVisibles(page)).toHaveCount(3)

  await control(page, 'Día anterior').click()
  await expect(tituloAgenda(page)).toHaveText(diaLargo(dia(2)))
  await expect(citasVisibles(page)).toHaveCount(2)

  await page.goto(`/?fecha=${dia(6)}`)
  await expect(page.getByText('No tienes citas este día.')).toBeVisible()
})

test('una fecha inválida en la URL muestra hoy', async ({ page }) => {
  await page.setViewportSize(CELULAR)
  await entrarComoDemo(page, '/?fecha=2026-02-30')
  await expect(tituloAgenda(page)).toHaveText(diaLargo(hoy()))
})

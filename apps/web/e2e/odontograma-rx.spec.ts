// La columna Rx (0023): ✓ si se tomó la radiografía de la pieza. En el seed,
// Martín tiene dos Rx de la 46: hace 45 días y hace 7.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { hoy, sumarDias } from './apoyo/fechas'
import { ESCRITORIO, alerta, campo, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const MARTIN = '50000000-0000-4000-8000-000000000002'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${MARTIN}/odontograma`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const pieza = (n: number) => page.getByRole('button', { name: new RegExp(`^Pieza ${n}[:,]`) })

test('el gráfico avisa qué piezas tienen Rx', async () => {
  await expect(pieza(46)).toHaveAccessibleName(
    new RegExp(
      `, Rx del ${numerica(sumarDias(hoy(), -7))} y del ${numerica(sumarDias(hoy(), -45))}$`,
    ),
  )
  await expect(pieza(46)).toContainText('Rx')
  await expect(pieza(16)).not.toContainText('Rx')
})

test('la tabla tiene la columna Rx, como en papel', async () => {
  await control(page, 'Tabla').click()
  const fila46 = principal(page).getByRole('button').filter({ hasText: /^46/ })
  await expect(fila46).toContainText(`Rx del ${numerica(sumarDias(hoy(), -7))}`)
  await control(page, 'Gráfico').click()
})

test('se agrega una Rx desde el panel de la pieza, y se anula', async () => {
  await pieza(16).click()
  const h = hoja(page)
  await expect(h.getByRole('heading', { name: 'Radiografías (Rx)' })).toBeVisible()
  await campo(h, 'Detalle').fill('Bite-wing')
  // Enter agrega la Rx, no un registro.
  await campo(h, 'Detalle').press('Enter')
  await expect(h.getByText(`Rx del ${numerica(hoy())} · Bite-wing`)).toBeVisible()
  await expect(alerta(h)).toHaveCount(0)
  await expect(h.getByRole('heading', { name: 'Registrado' })).toBeVisible()
  await expect(h.getByText('Obt-O')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(pieza(16)).toHaveAccessibleName(/, Rx del /)

  await pieza(16).click()
  await control(hoja(page), `Anular la Rx del ${numerica(hoy())}`).click()
  await control(hoja(page), 'Sí, anular').click()
  await expect(hoja(page).getByText(/^Rx del/)).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(pieza(16)).not.toHaveAccessibleName(/Rx/)
})

test('no se registra una Rx con fecha futura', async () => {
  await pieza(16).click()
  const h = hoja(page)
  await campo(h, 'Tomada el').fill(sumarDias(hoy(), 1))
  await control(h, 'Agregar Rx a la pieza 16').click()
  await expect(alerta(h)).toHaveText('La fecha no puede ser futura.')
  await page.keyboard.press('Escape')
})

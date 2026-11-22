// Editar la nota de un registro (0025): quien lo cargó, el mismo día. En el
// seed, los registros de Sofía son de hace 20 días.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { ESCRITORIO, alerta, campo, control, entrarComoDemo, hoja } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const SOFIA = '50000000-0000-4000-8000-000000000006'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${SOFIA}/odontograma`)
})

test.afterAll(() => page.close())

const pieza = (n: number) => page.getByRole('button', { name: new RegExp(`^Pieza ${n}[:,]`) })

test('un registro de otro día no se edita: solo se anula', async () => {
  await pieza(85).click()
  const h = hoja(page)
  await expect(control(h, 'Anular Ext')).toBeVisible()
  await expect(h.getByRole('button', { name: /^Editar la nota/ })).toHaveCount(0)
  await page.keyboard.press('Escape')
})

test('la nota de hoy se corrige, y Enter la guarda', async () => {
  await pieza(14).click()
  const h = hoja(page)
  await campo(h, 'Nota').fill('Sensibilidad al frio')
  await control(h, 'Agregar a la pieza 14').click()
  await expect(h.getByText('Sensibilidad al frio')).toBeVisible()

  await control(h, 'Editar la nota').click()
  await campo(h, 'Corregir la nota').fill('Sensibilidad al frío')
  await campo(h, 'Corregir la nota').press('Enter')
  await expect(h.getByText('Nota Sensibilidad al frío')).toBeVisible()
  await expect(h.getByText('Sensibilidad al frio')).toHaveCount(0)
  // Enter no agregó otro registro.
  await expect(h.getByRole('button', { name: 'Anular la nota' })).toHaveCount(1)
})

test('una nota sola no queda vacía', async () => {
  const h = hoja(page)
  await control(h, 'Editar la nota').click()
  await campo(h, 'Corregir la nota').fill('  ')
  await control(h, 'Guardar nota').click()
  await expect(alerta(h)).toHaveText('Una nota sola no puede quedar vacía. Para quitarla, anúlala.')
  await control(h, 'Cancelar').click()
  await page.keyboard.press('Escape')
  await expect(pieza(14)).toHaveAccessibleName('Pieza 14: nota: Sensibilidad al frío')
})

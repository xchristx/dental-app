// Modo pincel y pieza grande del odontograma: elegir el código una vez y
// tocar piezas seguidas. Lucía no tiene nada registrado en el seed.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { ESCRITORIO, campo, control, entrarComoDemo, hoja, titulo } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const LUCIA = '50000000-0000-4000-8000-000000000003'

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  h = hoja(page)
  await entrarComoDemo(page, `/pacientes/${LUCIA}/odontograma`)
})

test.afterAll(() => page.close())

const pieza = (n: number) => page.getByRole('button', { name: new RegExp(`^Pieza ${n}[:,]`) })
const estado = () => page.getByRole('status')

test('con el pincel, un código sin caras se marca al tocar cada pieza', async () => {
  await control(page, 'Pincel').click()
  await expect(page.getByRole('button', { name: 'Pincel' })).toHaveAttribute('aria-pressed', 'true')

  // Sin código elegido, avisa.
  await pieza(18).click()
  await expect(estado()).toHaveText('Elige primero qué vas a marcar.')

  await campo(page.locator('main'), 'Marcar con el pincel').selectOption({ label: 'Aus · Ausente' })
  await pieza(18).click()
  await expect(estado()).toContainText('Agregado Aus en la 18.')
  await pieza(28).click()
  await expect(estado()).toContainText('Agregado Aus en la 28.')
  await expect(pieza(18)).toHaveAccessibleName('Pieza 18: Aus (ausente)')

  // Deshacer anula solo lo último.
  await control(page, 'Deshacer').click()
  await expect(pieza(28)).toHaveAccessibleName('Pieza 28, sin registros')
  await expect(pieza(18)).toHaveAccessibleName('Pieza 18: Aus (ausente)')
})

test('con un código por caras, se eligen en la pieza grande', async () => {
  await campo(page.locator('main'), 'Marcar con el pincel').selectOption({ label: 'C · Caries' })
  await campo(page.locator('main'), 'Grado').selectOption('2')
  await pieza(46).click()
  await expect(titulo(h)).toHaveText('Pieza 46')
  await expect(h).toContainText('C · Caries · grado II')

  // El centro del dibujo grande es la cara oclusal; la distal, con su botón.
  await h.locator('fieldset svg').click()
  await expect(h.getByRole('checkbox', { name: /Oclusal/ })).toBeChecked()
  await h.getByText('Distal', { exact: true }).click()
  await control(h, 'Agregar a la pieza 46').click()
  await expect(h).toHaveCount(0)

  await expect(estado()).toContainText('Agregado C II-OD en la 46.')
  await expect(pieza(46)).toHaveAccessibleName('Pieza 46: C II-OD (caries)')
})

test('al terminar, tocar una pieza vuelve a abrir su panel', async () => {
  await control(page, 'Terminar').click()
  await expect(page.getByRole('button', { name: 'Pincel' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await pieza(46).click()
  await expect(titulo(h)).toHaveText('Pieza 46')
  await expect(h.getByRole('region', { name: 'Registrado' })).toContainText('C II-OD')
})

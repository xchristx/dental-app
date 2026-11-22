// Derivaciones (0019): derivado por y derivado a, a una socia o a alguien de afuera.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, reiniciarBase, sql } from './apoyo/base'
import { hoy } from './apoyo/fechas'
import { alerta, campo, control, entrarComoDemo, hoja, principal, titulo } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const MARTIN = '50000000-0000-4000-8000-000000000002'

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, `/pacientes/${MARTIN}`)
})

test.afterAll(() => page.close())

const fechaNumerica = (f: string) => f.split('-').reverse().join('/')
const seccion = () => principal(page).getByRole('region', { name: 'Derivaciones' })
const entradas = () =>
  seccion()
    .locator('ul > li')
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n+/g, ' | ')))

test('la ficha muestra quién derivó al paciente', async () => {
  await expect.poll(entradas).toHaveLength(1)
  expect((await entradas())[0]).toMatch(
    /^Derivado por Dr\. Ramiro Soliz, odontología general \| \d{2}\/\d{2}\/\d{4} · Endodoncia en 46\. \| Corregir$/,
  )
})

test('se deriva a una socia, se corrige y se borra', async () => {
  await seccion().getByRole('button', { name: 'Agregar' }).click()
  await expect(titulo(h)).toHaveText('Nueva derivación')

  // Alguien de afuera sin nombre: pide a quién.
  await control(h, 'Guardar derivación').click()
  await expect(alerta(h)).toHaveText('Elige una profesional o escribe a quién.')

  await h.getByText('Derivado a', { exact: true }).click()
  await campo(h, 'A quién').selectOption({ label: 'Dra. Rocío Paz · Ortodoncia' })
  await expect(campo(h, 'Nombre')).toHaveCount(0)
  await campo(h, 'Motivo').fill('Evaluar apiñamiento inferior.')
  await control(h, 'Guardar derivación').click()
  await expect(h).toHaveCount(0)

  await expect.poll(entradas).toHaveLength(2)
  expect((await entradas())[0]).toBe(
    `Derivado a Dra. Rocío Paz · Ortodoncia | ${fechaNumerica(hoy())} · Evaluar apiñamiento inferior. | Corregir`,
  )
  const { rows } = await sql(
    'select sentido, profesional_id, contacto from derivaciones where motivo like $1',
    ['Evaluar apiñamiento%'],
  )
  expect(rows).toEqual([{ sentido: 'enviada', profesional_id: ID.rocio, contacto: null }])

  await seccion()
    .getByRole('button', { name: /Corregir/ })
    .first()
    .click()
  await expect(titulo(h)).toHaveText('Corregir derivación')
  await campo(h, 'Motivo').fill('Evaluar apiñamiento inferior y superior.')
  await control(h, 'Guardar derivación').click()
  await expect(seccion()).toContainText('apiñamiento inferior y superior.')

  await seccion()
    .getByRole('button', { name: /Corregir/ })
    .first()
    .click()
  await control(h, 'Borrar derivación').click()
  await control(h, 'Sí, borrar').click()
  await expect(h).toHaveCount(0)
  await expect.poll(entradas).toHaveLength(1)
})

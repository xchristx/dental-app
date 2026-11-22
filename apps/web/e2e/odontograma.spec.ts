// Odontograma (0020): índices, gráfico de cinco caras, tabla como la ficha en
// papel, y agregar y quitar registros. Sofía tiene dentición mixta en el seed.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { reiniciarBase, sql } from './apoyo/base'
import {
  ESCRITORIO,
  alerta,
  campo,
  control,
  entrarComoDemo,
  hoja,
  principal,
  titulo,
} from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const SOFIA = '50000000-0000-4000-8000-000000000006'

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  h = hoja(page)
  await entrarComoDemo(page, `/pacientes/${SOFIA}`)
})

test.afterAll(() => page.close())

const indices = () => principal(page).locator('dl').first()
const registrosDeLaHoja = () =>
  h
    .getByRole('region', { name: 'Registrado' })
    .locator('li')
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.split('\n')[0]))

test('la ficha resume el odontograma y lleva a él', async () => {
  const resumen = principal(page).getByRole('region', { name: 'Odontograma' })
  await expect(resumen).toContainText('2 hallazgos a tratar · CPO-D 0 · ceo-d 3')
  await control(resumen, 'Abrir').click()
  await expect(page).toHaveURL(new RegExp(`/pacientes/${SOFIA}/odontograma$`))
  await expect(principal(page).getByRole('heading', { level: 1 })).toHaveText('Odontograma')
  await expect(indices()).toContainText('CPO-D 0C 0 · P 0 · O 0')
  await expect(indices()).toContainText('ceo-d 3c 1 · e 1 · o 1')
})

test('el gráfico describe cada pieza con sus registros', async () => {
  const grafico = page.getByRole('group', { name: 'Gráfico del odontograma' })
  await expect(grafico.getByRole('button', { name: 'Pieza 55: C II-O (caries)' })).toBeVisible()
  await expect(
    grafico.getByRole('button', { name: 'Pieza 85: Ext (extracción indicada)' }),
  ).toBeVisible()
  await expect(grafico.getByRole('button', { name: 'Pieza 11, sin registros' })).toBeVisible()
})

test('se agrega una caries por caras y con grado, y cuenta en el CPO-D', async () => {
  await page.getByRole('button', { name: /^Pieza 36/ }).click()
  await expect(titulo(h)).toHaveText('Pieza 36')
  await expect(registrosDeLaHoja()).resolves.toEqual(['S Sellante'])

  await campo(h, 'Código').selectOption({ label: 'C · Caries' })
  await control(h, 'Agregar a la pieza 36').click()
  await expect(alerta(h)).toHaveText('Elige al menos una cara.')

  await h.getByText('Mesial', { exact: true }).click()
  await h.getByText('Oclusal', { exact: true }).click()
  await campo(h, 'Grado').selectOption('2')
  await control(h, 'Agregar a la pieza 36').click()
  await expect.poll(registrosDeLaHoja).toEqual(['C II-OM Caries', 'S Sellante'])
  // El formulario queda listo para otro.
  await expect(campo(h, 'Código')).toHaveValue('')

  await page.keyboard.press('Escape')
  await expect(indices()).toContainText('CPO-D 1C 1 · P 0 · O 0')
  const { rows } = await sql(
    `select caras, grado from odontograma_registros where pieza = 36 and paciente_id = $1 and grado is not null`,
    [SOFIA],
  )
  expect(rows).toEqual([{ caras: ['O', 'M'], grado: 2 }])
})

test('quitar un hallazgo lo saca del gráfico y del índice', async () => {
  await page.getByRole('button', { name: /^Pieza 55/ }).click()
  await expect(titulo(h)).toHaveText('Pieza 55')
  await h.getByRole('button', { name: 'Quitar C II-O' }).click()
  await control(h, 'Sí, quitar').click()
  await expect(h).toContainText('Nada registrado en esta pieza.')
  await page.keyboard.press('Escape')
  await expect(indices()).toContainText('ceo-d 2c 0 · e 1 · o 1')
  await expect(page.getByRole('button', { name: 'Pieza 55, sin registros' })).toBeVisible()
})

test('la tabla muestra la permanente y la temporal juntas, como en papel', async () => {
  await control(page, 'Tabla').click()
  await expect(page.getByRole('button', { name: 'Tabla', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const fila = (texto: RegExp) => principal(page).locator('li button').filter({ hasText: texto })
  await expect(fila(/^36/)).toHaveText(/^36A tratar: C II-OMHecho: S$/)
  await expect(fila(/^45 · 85/)).toHaveText(/^45 · 85A tratar: 85 ExtHecho: $/)

  // Una fila con temporal deja elegir cuál de las dos piezas.
  await fila(/^15 · 55/).click()
  await expect(titulo(h)).toHaveText('Pieza 15')
  await h.getByRole('button', { name: '55 · Temporal' }).click()
  await expect(titulo(h)).toHaveText('Pieza 55')
})

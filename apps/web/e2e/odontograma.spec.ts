// Odontograma (0020): índices, gráfico de cinco caras, tabla como la ficha en
// papel, y agregar y quitar registros. Sofía tiene dentición mixta en el seed.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { reiniciarBase, sql } from './apoyo/base'
import { hoy } from './apoyo/fechas'
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

test('se anota una nota sola sobre la pieza, sin código', async () => {
  await page.getByRole('button', { name: /^Pieza 14/ }).click()
  await expect(titulo(h)).toHaveText('Pieza 14')
  await expect(campo(h, 'Código')).toHaveValue('')

  // Sin código ni nota no hay nada que guardar.
  await control(h, 'Agregar a la pieza 14').click()
  await expect(alerta(h)).toHaveText('Elige un código o escribe una nota.')

  await campo(h, 'Nota').fill('Sensibilidad al frío')
  await control(h, 'Agregar a la pieza 14').click()
  await expect.poll(registrosDeLaHoja).toEqual(['Nota Sensibilidad al frío'])
  await page.keyboard.press('Escape')

  await expect(
    page.getByRole('button', { name: 'Pieza 14: nota: Sensibilidad al frío' }),
  ).toBeVisible()
  // No cuenta en los índices.
  await expect(indices()).toContainText('CPO-D 1C 1 · P 0 · O 0')
})

test('anular un hallazgo cargado por error lo saca del gráfico y del índice', async () => {
  await page.getByRole('button', { name: /^Pieza 55/ }).click()
  await expect(titulo(h)).toHaveText('Pieza 55')
  await h.getByRole('button', { name: 'Anular C II-O' }).click()
  await control(h, 'Sí, anular').click()
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
  // La nota sola va debajo, a lo ancho.
  await expect(fila(/^14 · 54/)).toHaveText(/^14 · 54A tratar: Hecho: Nota: Sensibilidad al frío$/)

  // Una fila con temporal deja elegir cuál de las dos piezas.
  await fila(/^15 · 55/).click()
  await expect(titulo(h)).toHaveText('Pieza 15')
  await h.getByRole('button', { name: '55 · Temporal' }).click()
  await expect(titulo(h)).toHaveText('Pieza 55')
  await page.keyboard.press('Escape')
  await expect(h).toHaveCount(0)
})

const hoyNumerico = () => hoy().split('-').reverse().join('/')
const plan = () =>
  principal(page)
    .getByRole('region', { name: 'Plan de tratamiento' })
    .locator('li')
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n+/g, ' ')))

test('desde el plan, un hallazgo se marca como tratado y queda lo realizado', async () => {
  await expect
    .poll(plan)
    .toEqual([
      '36 C II-OM Caries Tratar',
      '85 Ext Extracción indicada · Movilidad, por exfoliar Tratar',
    ])

  await principal(page)
    .getByRole('button', { name: 'Marcar C II-OM de la pieza 36 como tratado' })
    .click()
  await expect(titulo(h)).toHaveText('Pieza 36')
  await expect(h).toContainText('Tratando C II-OM caries')
  // Sugiere la obturación con las mismas caras.
  const obturacion = await h
    .locator('option', { hasText: 'Obt · Obturación' })
    .getAttribute('value')
  await expect(campo(h, 'Qué se hizo')).toHaveValue(obturacion ?? 'falta la opción')
  await expect(h.getByRole('checkbox', { name: /Oclusal/ })).toBeChecked()
  await expect(h.getByRole('checkbox', { name: /Mesial/ })).toBeChecked()
  await campo(h, 'Nota').fill('Resina A2')
  await control(h, 'Guardar tratamiento').click()

  const caries = h
    .getByRole('region', { name: 'Registrado' })
    .locator('li')
    .filter({ hasText: 'C II-OM Caries' })
  await expect(caries).toContainText(`Tratado el ${hoyNumerico()} con Obt-OM`)
  await expect(caries.getByRole('button')).toHaveCount(0)
  await page.keyboard.press('Escape')

  await expect.poll(plan).toEqual(['85 Ext Extracción indicada · Movilidad, por exfoliar Tratar'])
  // Ya no es una caries: cuenta como obturada.
  await expect(indices()).toContainText('CPO-D 1C 0 · P 0 · O 1')
})

test('anular el tratamiento deja el hallazgo pendiente otra vez', async () => {
  await page.getByRole('button', { name: /^36 / }).click()
  await h.getByRole('button', { name: 'Anular Obt-OM' }).click()
  await expect(h).toContainText('El hallazgo que trató vuelve a quedar pendiente.')
  await control(h, 'Sí, anular').click()
  await page.keyboard.press('Escape')
  await expect.poll(plan).toHaveLength(2)
  await expect(indices()).toContainText('CPO-D 1C 1 · P 0 · O 0')
})

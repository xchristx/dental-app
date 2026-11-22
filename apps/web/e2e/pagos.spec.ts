// Presupuestos y libro de pagos (0026). En el seed, Jorge tiene una ortodoncia
// de Bs 6.500 con cuatro pagos y un descuento; Lucía no tiene presupuestos.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { hoy } from './apoyo/fechas'
import { ESCRITORIO, alerta, campo, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const JORGE = '50000000-0000-4000-8000-000000000004'
const LUCIA = '50000000-0000-4000-8000-000000000003'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${JORGE}`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const presupuesto = (nombre: string) =>
  principal(page).getByRole('article', { name: nombre, exact: true })
const resumen = (nombre: string) =>
  presupuesto(nombre)
    .locator('dl > div')
    .evaluateAll((filas) =>
      Object.fromEntries(
        filas.map((f) => [
          f.querySelector('dt')?.textContent ?? '',
          f.querySelector('dd')?.textContent ?? '',
        ]),
      ),
    )
const planilla = (nombre: string) =>
  presupuesto(nombre)
    .locator('tbody tr')
    .evaluateAll((filas) =>
      filas.map((f) =>
        [...f.children].map((c) => (c as HTMLElement).innerText.replace(/\n+/g, ' · ')),
      ),
    )

test('la planilla es como la de papel: abonado, saldo anterior y saldo actual', async () => {
  await expect
    .poll(() => resumen('Ortodoncia'))
    .toEqual({
      Total: 'Bs 6.500',
      Pagado: 'Bs 2.200',
      Saldo: 'Bs 4.200',
    })
  // Con poll: la tabla puede terminar de acomodarse después del resumen.
  await expect
    .poll(async () => (await planilla('Ortodoncia')).map((f) => f.slice(1)))
    .toEqual([
      ['Bs 1.000 · Efectivo', 'Bs 6.500', 'Bs 5.500', 'N.º 0001'],
      ['Bs 400 · QR', 'Bs 5.500', 'Bs 5.100', 'N.º 0002'],
      ['Bs 400 · Transferencia', 'Bs 5.100', 'Bs 4.700', 'N.º 0003'],
      ['Ajuste −Bs 100 · Descuento por pago puntual', 'Bs 4.700', 'Bs 4.600', '—'],
      ['Bs 400 · QR', 'Bs 4.600', 'Bs 4.200', 'N.º 0004'],
    ])
  await expect(
    principal(page).getByRole('region', { name: 'Planilla de pagos de Ortodoncia' }),
  ).toBeVisible()
})

test('registrar un pago propone la cuota sugerida y numera el recibo', async () => {
  await control(principal(page), 'Registrar pago de Ortodoncia').click()
  const h = hoja(page)
  await expect(campo(h, 'Monto')).toHaveValue('400')
  // Sin forma de pago no se guarda.
  await control(h, 'Guardar pago').click()
  await expect(alerta(h)).toHaveText('Elige cómo pagó.')
  await h.getByLabel('Efectivo').check()
  await control(h, 'Guardar pago').click()
  // Guardado, se abre su recibo para mandarlo (0028).
  await expect(hoja(page).getByRole('heading', { name: 'Recibo N.º 0006' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hoja(page)).toBeHidden()

  await expect.poll(() => resumen('Ortodoncia')).toMatchObject({ Saldo: 'Bs 3.800' })
  const ultima = (await planilla('Ortodoncia')).at(-1)
  expect(ultima).toEqual([numerica(hoy()), 'Bs 400 · Efectivo', 'Bs 4.200', 'Bs 3.800', 'N.º 0006'])
})

test('un pago no puede superar el saldo', async () => {
  await control(principal(page), 'Registrar pago de Ortodoncia').click()
  const h = hoja(page)
  await campo(h, 'Monto').fill('3.800,01')
  await h.getByLabel('QR').check()
  await control(h, 'Guardar pago').click()
  await expect(alerta(h)).toHaveText('El pago supera el saldo (Bs 3.800).')
  await page.keyboard.press('Escape')
})

test('un ajuste sube el saldo y queda a la vista', async () => {
  await control(principal(page), 'Ajuste de Ortodoncia').click()
  const h = hoja(page)
  await campo(h, 'Monto').fill('500')
  await campo(h, 'Motivo').fill('Se agregó un retenedor')
  await control(h, 'Guardar ajuste').click()
  await expect(h).toBeHidden()
  await expect.poll(() => resumen('Ortodoncia')).toMatchObject({ Saldo: 'Bs 4.300' })
  expect((await planilla('Ortodoncia')).at(-1)?.[1]).toBe('Ajuste +Bs 500 · Se agregó un retenedor')
})

test('un presupuesto nuevo, con su cuota inicial propuesta en el primer pago', async () => {
  await page.goto(`/pacientes/${LUCIA}`)
  await expect(principal(page)).toContainText('Sin presupuestos.')
  await control(principal(page), 'Nuevo presupuesto').click()
  const h = hoja(page)
  await campo(h, 'Tratamiento').fill('Blanqueamiento')
  await campo(h, 'Total').fill('1.200')
  await campo(h, 'Cuota inicial').fill('500')
  await control(h, 'Guardar presupuesto').click()
  await expect(h).toBeHidden()
  await expect
    .poll(() => resumen('Blanqueamiento'))
    .toEqual({
      Total: 'Bs 1.200',
      Pagado: 'Bs 0',
      Saldo: 'Bs 1.200',
    })

  await control(principal(page), 'Registrar pago de Blanqueamiento').click()
  await expect(campo(hoja(page), 'Monto')).toHaveValue('500')
  await page.keyboard.press('Escape')

  // Sin movimientos, se puede anular.
  await control(presupuesto('Blanqueamiento'), 'Anular').click()
  await control(presupuesto('Blanqueamiento'), 'Sí, anular').click()
  await expect(principal(page)).toContainText('Sin presupuestos.')
})

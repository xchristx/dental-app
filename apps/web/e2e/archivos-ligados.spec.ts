// La imagen de una Rx y el comprobante de un pago (0029). En el seed, Martín
// tiene dos Rx de la 46 (hace 45 días y hace 7) y Jorge pagó en efectivo (recibo
// 1) y por QR (recibo 2). El seed de la demo no permite archivos; acá se activa.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase, sql } from './apoyo/base'
import { hoy, sumarDias } from './apoyo/fechas'
import { ESCRITORIO, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const MARTIN = '50000000-0000-4000-8000-000000000002'
const JORGE = '50000000-0000-4000-8000-000000000004'
const ORGANIZACION = '10000000-0000-4000-8000-000000000001'

/** Una imagen de 1 × 1 en PNG. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)
const PDF = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n')

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await sql('update organizaciones set permite_archivos = true where id = $1', [ORGANIZACION])
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${MARTIN}/odontograma`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const hace7 = numerica(sumarDias(hoy(), -7))
const pieza = (n: number) => page.getByRole('button', { name: new RegExp(`^Pieza ${n}[:,]`) })

test('la imagen de una Rx se adjunta desde el panel de la pieza', async () => {
  await pieza(46).click()
  const h = hoja(page)
  await h.getByLabel(`Adjuntar imagen de la Rx del ${hace7}`).setInputFiles({
    name: 'rx-46.png',
    mimeType: 'image/png',
    buffer: PNG,
  })
  await expect(h.getByRole('status').filter({ hasText: 'Listo' })).toHaveText(
    'Listo: se adjuntó la imagen.',
  )
  const enlace = control(h, `Abrir la imagen de la Rx del ${hace7}`)
  await expect(enlace).toHaveAttribute('href', /\/storage\/v1\/object\/sign\/archivos\//)
  await expect(enlace.locator('img')).toBeVisible()
  // La otra Rx de la 46 sigue sin imagen.
  await expect(
    control(h, `Abrir la imagen de la Rx del ${numerica(sumarDias(hoy(), -45))}`),
  ).toHaveCount(0)

  const { rows } = await sql(
    'select tipo, fecha::text, rx_id is not null as ligada from archivos where paciente_id = $1',
    [MARTIN],
  )
  expect(rows).toEqual([{ tipo: 'radiografia', fecha: sumarDias(hoy(), -7), ligada: true }])
  await page.keyboard.press('Escape')

  // En la ficha, con las demás radiografías, y con su pieza.
  await page.goto(`/pacientes/${MARTIN}`)
  await expect(
    principal(page)
      .locator('section[aria-labelledby=titulo-archivos]')
      .getByRole('button', { name: `Radiografía de la pieza 46 del ${hace7}` }),
  ).toBeVisible()
})

test('el comprobante se adjunta en el recibo del pago, y se anula', async () => {
  await page.goto(`/pacientes/${JORGE}`)
  // En efectivo no hay comprobante.
  await control(principal(page), 'Ver el recibo N.º 0001').click()
  await expect(hoja(page).getByRole('heading', { name: 'Recibo N.º 0001' })).toBeVisible()
  await expect(hoja(page).getByRole('heading', { name: 'Comprobante del pago' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await control(principal(page), 'Ver el recibo N.º 0002').click()
  const h = hoja(page)
  await expect(h.getByRole('heading', { name: 'Comprobante del pago' })).toBeVisible()
  await h.getByLabel('Adjuntar comprobante del recibo N.º 0002').setInputFiles({
    name: 'qr.pdf',
    mimeType: 'application/pdf',
    buffer: PDF,
  })
  await expect(h.getByRole('status').filter({ hasText: 'Listo' })).toHaveText(
    'Listo: se adjuntó el comprobante.',
  )
  await expect(control(h, 'Abrir el comprobante del recibo N.º 0002')).toBeVisible()

  // No se mezcla con las radiografías y fotos de la ficha (con la hoja cerrada:
  // abierta, el resto de la página queda inerte).
  await page.keyboard.press('Escape')
  await expect(h).toBeHidden()
  const ficha = principal(page).locator('section[aria-labelledby=titulo-archivos]')
  await expect(ficha).toContainText('Sin archivos.')
  await expect(ficha.getByRole('button', { name: /^Comprobante/ })).toHaveCount(0)

  await control(principal(page), 'Ver el recibo N.º 0002').click()
  await control(h, 'Anular el comprobante del recibo N.º 0002').click()
  await control(h, 'Sí, anular el comprobante del recibo N.º 0002').click()
  await expect(control(h, 'Abrir el comprobante del recibo N.º 0002')).toHaveCount(0)
  await expect(h.getByLabel('Adjuntar comprobante del recibo N.º 0002')).toBeAttached()
  await page.keyboard.press('Escape')
})

test('en la demo no se adjuntan', async () => {
  await sql('update organizaciones set permite_archivos = false where id = $1', [ORGANIZACION])
  await page.goto(`/pacientes/${JORGE}`)
  await control(principal(page), 'Ver el recibo N.º 0002').click()
  await expect(hoja(page)).toContainText('En la demo no se adjuntan comprobantes.')
  await expect(hoja(page).getByLabel(/^Adjuntar comprobante/)).toHaveCount(0)
})

// Recibo por WhatsApp (0028). En el seed, Jorge pagó la cuota inicial de su
// ortodoncia (recibo 1) y tres cuotas. Acá se le pone un celular inventado.
import { readFile } from 'node:fs/promises'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { reiniciarBase, sql } from './apoyo/base'
import { hoy } from './apoyo/fechas'
import { ESCRITORIO, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const JORGE = '50000000-0000-4000-8000-000000000004'

test.beforeAll(async () => {
  await reiniciarBase()
  await sql("update pacientes set telefono = '71234567' where id = $1", [JORGE])
})

const numerica = (f: string) => f.split('-').reverse().join('/')
const vistaPrevia = (page: Page) =>
  hoja(page)
    .getByRole('article', { name: 'Vista previa del recibo' })
    .locator('dl > div')
    .evaluateAll((filas) =>
      Object.fromEntries(
        filas.map((f) => [
          f.querySelector('dt')?.textContent ?? '',
          f.querySelector('dd')?.textContent ?? '',
        ]),
      ),
    )

/** Una página sin el menú de compartir (como muchas computadoras), o con uno simulado. */
async function abrir(browser: Browser, compartir: boolean) {
  const page = await browser.newPage({ viewport: ESCRITORIO })
  await page.addInitScript((puede) => {
    if (puede) {
      Object.assign(navigator, {
        canShare: () => true,
        share: async (datos: ShareData) => {
          Object.assign(window, {
            compartido: `${datos.files?.[0]?.name ?? ''}|${datos.text ?? ''}`,
          })
        },
      })
    } else {
      Object.assign(navigator, { canShare: undefined })
    }
  }, compartir)
  // wa.me no se visita de verdad.
  await page.context().route('https://wa.me/**', (r) => r.fulfill({ body: 'WhatsApp' }))
  await entrarComoDemo(page, `/pacientes/${JORGE}`)
  return page
}

test('el recibo tiene lo de un recibo de papel, y se descarga en PDF', async ({ browser }) => {
  const page = await abrir(browser, false)
  await control(principal(page), 'Ver el recibo N.º 0001').click()
  await expect
    .poll(() => vistaPrevia(page))
    .toMatchObject({
      'Recibí de': 'Jorge Mamani',
      'La suma de': 'Bs 1.000',
      Son: 'mil 00/100 bolivianos',
      Concepto: 'Ortodoncia',
      'Forma de pago': 'Efectivo',
      'Saldo anterior': 'Bs 6.500',
      'Saldo actual': 'Bs 5.500',
    })
  await expect(hoja(page)).toContainText('Este recibo no es una factura.')

  const descarga = page.waitForEvent('download')
  await control(hoja(page), 'Descargar PDF').click()
  const archivo = await descarga
  expect(archivo.suggestedFilename()).toBe('recibo-0001.pdf')
  const contenido = await readFile((await archivo.path()) ?? '')
  expect(contenido.subarray(0, 5).toString()).toBe('%PDF-')
  await page.close()
})

test('sin menú de compartir, descarga el PDF y abre WhatsApp con el texto', async ({ browser }) => {
  const page = await abrir(browser, false)
  await control(principal(page), 'Ver el recibo N.º 0002').click()
  const descarga = page.waitForEvent('download')
  const ventana = page.waitForEvent('popup')
  await control(hoja(page), 'Enviar por WhatsApp').click()
  expect((await descarga).suggestedFilename()).toBe('recibo-0002.pdf')
  const whatsapp = new URL((await ventana).url())
  expect(whatsapp.pathname).toBe('/59171234567')
  expect(whatsapp.searchParams.get('text')).toMatch(
    /^Hola, Jorge\. Te envío el recibo N\.º 0002 de .+: recibimos Bs 400 \(QR\)/,
  )
  // Por si el navegador bloquea la ventana: el enlace queda a mano.
  await expect(hoja(page).getByRole('status')).toContainText('Se descargó el PDF.')
  await expect(hoja(page).getByRole('link', { name: 'Abrir WhatsApp' })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/59171234567\?text=/,
  )
  await page.close()
})

test('al registrar un pago se abre su recibo, y en el celular se comparte', async ({ browser }) => {
  const page = await abrir(browser, true)
  await control(principal(page), 'Registrar pago de Ortodoncia').click()
  await hoja(page).getByLabel('Transferencia').check()
  await control(hoja(page), 'Guardar pago').click()

  await expect(hoja(page).getByRole('heading', { name: 'Recibo N.º 0006' })).toBeVisible()
  await expect
    .poll(() => vistaPrevia(page))
    .toMatchObject({
      Fecha: numerica(hoy()),
      'La suma de': 'Bs 400',
      Son: 'cuatrocientos 00/100 bolivianos',
      'Saldo actual': 'Bs 3.800',
    })
  await control(hoja(page), 'Enviar por WhatsApp').click()
  await expect(hoja(page).getByRole('status')).toHaveText('Listo: el recibo se compartió.')
  const compartido = await page.evaluate(
    () => (window as unknown as { compartido: string }).compartido,
  )
  expect(compartido).toMatch(/^recibo-0006\.pdf\|Hola, Jorge\./)
  expect(compartido).toContain('Te queda un saldo de Bs 3.800.')
  await page.close()
})

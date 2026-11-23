// Genera docs/guia/guia-sifel.pdf: saca capturas de la app con el seed (datos
// inventados) y las pone en guia.html, que después se imprime a PDF.
// Ver guia/playwright.config.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase, sql } from '../e2e/apoyo/base'
import { dia } from '../e2e/apoyo/fechas'

const AQUI = new URL('./', import.meta.url)
const CAPTURAS = new URL('capturas/', AQUI)
const PDF = new URL('../../../docs/guia/guia-sifel.pdf', AQUI)

const CAMILA = '50000000-0000-4000-8000-000000000001'
const JORGE = '50000000-0000-4000-8000-000000000004'
const DIEGO = '50000000-0000-4000-8000-000000000007'
const CITA_DE_DIEGO = '60000000-0000-4000-8000-000000000007'

const CELULAR = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }
const ESCRITORIO = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }

test.describe.configure({ mode: 'serial' })
test.beforeAll(async () => {
  await reiniciarBase()
  // Como en producción: con archivos (el seed los apaga, como la demo pública).
  await sql(`update public.organizaciones set permite_archivos = true`)
  // Un celular para que el detalle muestre "Enviar recordatorio". Es el número
  // de ejemplo que ya muestra la app; nadie lo toca, porque no se abre WhatsApp.
  await sql(`update public.pacientes set telefono = '71234567' where id = $1`, [DIEGO])
  mkdirSync(CAPTURAS, { recursive: true })
})

/** Entra con el correo del usuario de prueba del seed (no hay botón de demo). */
async function entrar(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('Correo').fill('demo@ejemplo.test')
  await page.getByLabel('Contraseña').fill('demo-sifel')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL((url) => url.pathname !== '/entrar')
}

/** Espera a que no queden esqueletos ni indicadores de carga, y a que terminen las animaciones. */
async function quieta(page: Page) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await page.waitForTimeout(500)
}

const rutaCaptura = (nombre: string) => fileURLToPath(new URL(`${nombre}.jpg`, CAPTURAS))

/** Captura de la pantalla, sin el anillo de foco que dejan las hojas al abrirse. */
async function foto(page: Page, nombre: string) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.screenshot({ path: rutaCaptura(nombre), quality: 88 })
}

const hojaAbierta = (page: Page) =>
  page.locator('[data-slot=sheet-content]:not([data-state=closed])').last()

test('capturas en el celular', async ({ browser }) => {
  const contexto = await browser.newContext(CELULAR)
  const page = await contexto.newPage()

  await page.goto('/entrar')
  await quieta(page)
  await foto(page, 'entrar')

  await entrar(page)
  await page.goto(`/?fecha=${dia(1)}`)
  await quieta(page)
  await foto(page, 'agenda-dia')

  await page.goto(`/?fecha=${dia(2)}&cita=${CITA_DE_DIEGO}`)
  await quieta(page)
  await expect(hojaAbierta(page)).toBeVisible()
  await foto(page, 'detalle-cita')

  await page.goto(`/?fecha=${dia(2)}`)
  await quieta(page)
  await page.getByRole('button', { name: 'Agendar' }).filter({ visible: true }).first().click()
  await expect(hojaAbierta(page)).toBeVisible()
  await expect(page.getByText('Buscando horarios libres…')).toHaveCount(0)
  await page.waitForTimeout(500)
  await foto(page, 'agendar')

  await page.goto('/pacientes')
  await quieta(page)
  await foto(page, 'pacientes')

  await page.goto(`/pacientes/${JORGE}`)
  await quieta(page)
  await foto(page, 'ficha')

  const pagos = page.locator('section[aria-labelledby="titulo-pagos"]')
  await pagos.scrollIntoViewIfNeeded()
  await quieta(page)
  await pagos.screenshot({
    path: rutaCaptura('pagos'),
    quality: 88,
  })

  await page
    .getByRole('button', { name: /^Ver el recibo/ })
    .last()
    .click()
  await expect(hojaAbierta(page)).toBeVisible()
  await expect(page.getByText('Armando el recibo…')).toHaveCount(0)
  await page.waitForTimeout(800)
  await foto(page, 'recibo')

  await page.goto(`/pacientes/${CAMILA}/odontograma`)
  await quieta(page)
  // En el celular abre en la vista de tabla, como la ficha en papel.
  await foto(page, 'odontograma-tabla')
  await page.getByRole('button', { name: /^36 / }).click()
  await expect(hojaAbierta(page)).toBeVisible()
  await page.waitForTimeout(500)
  await foto(page, 'pieza')

  await page.goto('/ajustes')
  await quieta(page)
  await foto(page, 'ajustes')

  await contexto.close()
})

test('capturas en la computadora', async ({ browser }) => {
  const contexto = await browser.newContext(ESCRITORIO)
  const page = await contexto.newPage()
  await entrar(page)

  await page.goto(`/?fecha=${dia(1)}`)
  await quieta(page)
  await foto(page, 'semana')

  await page.goto(`/pacientes/${CAMILA}/odontograma`)
  await quieta(page)
  await foto(page, 'odontograma')

  await contexto.close()
})

test('arma el PDF', async ({ page }) => {
  const enBase64 = (url: URL) => readFileSync(url).toString('base64')
  const fuente = (paquete: string, archivo: string) =>
    `data:font/woff2;base64,${enBase64(
      new URL(`../node_modules/@fontsource-variable/${paquete}/files/${archivo}`, AQUI),
    )}`

  let html = readFileSync(new URL('guia.html', AQUI), 'utf8')
    .replaceAll('{{fuente-geist}}', fuente('geist', 'geist-latin-wght-normal.woff2'))
    .replaceAll('{{fuente-newsreader}}', fuente('newsreader', 'newsreader-latin-wght-normal.woff2'))
    .replace(/\{\{captura:([a-z-]+)\}\}/g, (_, nombre: string) => {
      return `data:image/jpeg;base64,${enBase64(new URL(`${nombre}.jpg`, CAPTURAS))}`
    })
  const fecha = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' }).format(
    new Date(),
  )
  html = html.replaceAll('{{fecha}}', fecha.charAt(0).toUpperCase() + fecha.slice(1))

  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  mkdirSync(new URL('./', PDF), { recursive: true })
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true })
  writeFileSync(PDF, pdf)
})

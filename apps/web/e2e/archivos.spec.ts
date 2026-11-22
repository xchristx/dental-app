// Radiografías y fotos (0027). El seed de la demo no permite archivos; acá se
// activa para probar la subida, y al final se vuelve a la demo.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase, sql } from './apoyo/base'
import { hoy } from './apoyo/fechas'
import { ESCRITORIO, alerta, campo, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const LUCIA = '50000000-0000-4000-8000-000000000003'
const ORGANIZACION = '10000000-0000-4000-8000-000000000001'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await sql('update organizaciones set permite_archivos = true where id = $1', [ORGANIZACION])
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${LUCIA}`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const seccion = () => principal(page).locator('section[aria-labelledby=titulo-archivos]')

/** Una "foto de celular" de 4000 × 3000 en PNG, dibujada en el navegador. */
async function fotoGrande(): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const lienzo = document.createElement('canvas')
    lienzo.width = 4000
    lienzo.height = 3000
    const c = lienzo.getContext('2d')
    if (!c) return ''
    for (let i = 0; i < 40; i++) {
      c.fillStyle = `hsl(${i * 9}, 60%, ${30 + (i % 5) * 10}%)`
      c.fillRect(i * 100, 0, 100, 3000)
    }
    return lienzo.toDataURL('image/png').split(',')[1] ?? ''
  })
  return Buffer.from(base64, 'base64')
}

test('una radiografía se sube achicada, y se ve en la ficha', async () => {
  await expect(seccion()).toContainText('Sin archivos.')
  await control(seccion(), 'Subir').click()
  const h = hoja(page)
  const original = await fotoGrande()
  await h
    .locator('input[type=file]')
    .setInputFiles({ name: 'rx.png', mimeType: 'image/png', buffer: original })
  await expect(h.getByRole('img', { name: 'Vista previa del archivo elegido' })).toBeVisible()
  await campo(h, 'Nota').fill('Panorámica')
  await control(h, 'Subir').click()
  await expect(h).toBeHidden()

  const miniatura = seccion().getByRole('button', {
    name: `Radiografía del ${numerica(hoy())}: Panorámica`,
  })
  await expect(miniatura).toBeVisible()
  await expect
    .poll(() => miniatura.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(2000)

  const { rows } = await sql(
    'select mime, bytes, ruta from archivos where paciente_id = $1 and deleted_at is null',
    [LUCIA],
  )
  expect(rows[0]?.mime).toBe('image/jpeg')
  expect(rows[0]?.bytes).toBeLessThan(original.length)
  expect(rows[0]?.ruta).toMatch(new RegExp(`^${ORGANIZACION}/${LUCIA}/`))
})

test('un PDF se sube tal cual', async () => {
  await control(seccion(), 'Subir').click()
  const h = hoja(page)
  await h.locator('input[type=file]').setInputFiles({
    name: 'informe.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n'),
  })
  await h.getByLabel('Foto').check()
  await control(h, 'Subir').click()
  await expect(h).toBeHidden()
  await expect(seccion().getByRole('button', { name: `Foto del ${numerica(hoy())}` })).toBeVisible()
})

test('un formato que no se puede subir se avisa', async () => {
  await control(seccion(), 'Subir').click()
  const h = hoja(page)
  await h.locator('input[type=file]').setInputFiles({
    name: 'notas.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hola'),
  })
  await control(h, 'Subir').click()
  await expect(alerta(h)).toHaveText(
    'Ese formato no se puede subir. Usa una foto (JPG o PNG) o un PDF.',
  )
  await page.keyboard.press('Escape')
})

test('un archivo subido por error se anula', async () => {
  await seccion()
    .getByRole('button', { name: /^Radiografía del/ })
    .click()
  const h = hoja(page)
  await expect(h.getByRole('img', { name: /^Radiografía del/ })).toBeVisible()
  await expect(h.getByRole('link', { name: 'Abrir en tamaño original' })).toBeVisible()
  await control(h, 'Anular').click()
  await control(h, 'Sí, anular').click()
  await expect(h).toBeHidden()
  await expect(seccion().getByRole('button', { name: /^Radiografía del/ })).toHaveCount(0)
})

test('en la demo no se suben archivos', async () => {
  await sql('update organizaciones set permite_archivos = false where id = $1', [ORGANIZACION])
  await page.reload()
  await expect(seccion()).toContainText('En la demo no se suben archivos')
  await expect(control(seccion(), 'Subir')).toHaveCount(0)
})

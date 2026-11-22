// Editar el catálogo del odontograma en Ajustes (0022). La demo es la
// administradora. En el seed, Camila tiene una caries "C I-P" en 25.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { ESCRITORIO, alerta, campo, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const CAMILA = '50000000-0000-4000-8000-000000000001'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, '/ajustes')
})

test.afterAll(() => page.close())

const catalogo = () => principal(page).locator('section[aria-labelledby=titulo-catalogo]')
/** La fila de un código, por su abreviatura. */
const fila = (abreviatura: string) =>
  catalogo()
    .locator('li')
    .filter({ hasText: new RegExp(`^${abreviatura} `) })

test('muestra los hallazgos y lo realizado, con cómo se dibuja cada uno', async () => {
  await expect(fila('Rec')).toContainText('Pinta las caras · cuenta como cariada')
  await expect(fila('Ext')).toContainText('Cruz sobre la pieza')
  await expect(fila('Cor')).toContainText('Círculo alrededor')
})

test('una abreviatura corregida se ve en lo ya cargado', async () => {
  await control(catalogo(), 'Editar C (Caries)').click()
  const h = hoja(page)
  // Ya se usó: no cambia de tipo, caras ni grado.
  await expect(h.getByRole('radio', { name: /^Hallazgo/ })).toBeDisabled()
  await expect(h.getByRole('checkbox', { name: /^Lleva grado/ })).toBeDisabled()
  await expect(h.getByText('Así se ve en la pieza 36')).toBeVisible()

  await campo(h, 'Abreviatura').fill('Car')
  await expect(h.getByText('Car II-OM')).toBeVisible()
  await control(h, 'Guardar código').click()
  await expect(h).toBeHidden()
  await expect(control(catalogo(), 'Editar Car (Caries)')).toBeVisible()

  await page.goto(`/pacientes/${CAMILA}/odontograma`)
  await expect(page.getByRole('button', { name: /^Pieza 25:/ })).toHaveAccessibleName(
    'Pieza 25: Car I-P (caries)',
  )
  await page.goto('/ajustes')
})

test('no se repite una abreviatura en uso', async () => {
  await control(catalogo(), 'Agregar código').click()
  const h = hoja(page)
  await campo(h, 'Abreviatura').fill('obt')
  await campo(h, 'Nombre').fill('Otra obturación')
  await control(h, 'Guardar código').click()
  await expect(alerta(h)).toHaveText('Ya hay un código en uso con esa abreviatura.')
  await page.keyboard.press('Escape')
  await expect(h).toBeHidden()
})

test('un código nuevo se crea, se da de baja y vuelve a usarse', async () => {
  await control(catalogo(), 'Agregar código').click()
  const h = hoja(page)
  await campo(h, 'Abreviatura').fill('Fl')
  await campo(h, 'Nombre').fill('Fluorosis')
  await campo(h, 'Dibujo').selectOption({ label: 'Pinta las caras' })
  // Pintar las caras marca "Se eligen las caras".
  await expect(h.getByRole('checkbox', { name: /^Se eligen las caras/ })).toBeChecked()
  await control(h, 'Guardar código').click()
  await expect(h).toBeHidden()
  await expect(fila('Fl')).toContainText('Pinta las caras')

  await control(catalogo(), 'Editar Fl (Fluorosis)').click()
  await control(hoja(page), 'Dar de baja').click()
  await expect(hoja(page)).toBeHidden()
  await expect(control(catalogo(), 'Volver a usar Fl (Fluorosis)')).toBeVisible()

  // Dado de baja, no aparece para cargar en el odontograma.
  await page.goto(`/pacientes/${CAMILA}/odontograma`)
  await control(page, 'Pincel').click()
  const opciones = principal(page).getByLabel('Marcar con el pincel').locator('option')
  await expect(opciones.filter({ hasText: 'Car · Caries' })).toHaveCount(1)
  await expect(opciones.filter({ hasText: 'Fluorosis' })).toHaveCount(0)
  await page.goto('/ajustes')

  await control(catalogo(), 'Volver a usar Fl (Fluorosis)').click()
  await expect(control(catalogo(), 'Editar Fl (Fluorosis)')).toBeVisible()
})

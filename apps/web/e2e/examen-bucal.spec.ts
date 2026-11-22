// Examen bucal (0024). En el seed, Sofía tiene dos versiones: hace 20 días
// (cuando se cargó su odontograma) y hace 2.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { hoy, sumarDias } from './apoyo/fechas'
import { ESCRITORIO, campo, control, entrarComoDemo, hoja, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const SOFIA = '50000000-0000-4000-8000-000000000006'
const LUCIA = '50000000-0000-4000-8000-000000000003'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${SOFIA}/odontograma`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const examen = () => principal(page).locator('section[aria-labelledby=titulo-examen]')
/** Los pares "pregunta: respuesta" del examen. */
const respuestas = () =>
  examen()
    .locator('dl > div')
    .evaluateAll((filas) =>
      Object.fromEntries(
        filas.map((f) => [
          f.querySelector('dt')?.textContent ?? '',
          f.querySelector('dd')?.textContent ?? '',
        ]),
      ),
    )

test('muestra la versión vigente, con quién y cuándo', async () => {
  await expect.poll(respuestas).toMatchObject({
    '¿Se cepilla la lengua?': 'Sí',
    'Placa bacteriana': 'Sí',
    'Materia alba': 'No',
    Oclusión: 'Mordida abierta anterior',
    Observaciones: 'Mejoró el cepillado. Placa en el sector anteroinferior, de 33 a 43.',
  })
  await expect(examen()).toContainText(`Actualizado el ${numerica(sumarDias(hoy(), -2))} por`)
})

test('un día anterior muestra la versión de entonces, sin "Actualizar"', async () => {
  await page.getByRole('slider', { name: 'Ver la boca al' }).fill('0')
  await expect.poll(respuestas).toMatchObject({
    '¿Se cepilla la lengua?': 'No',
    'Materia alba': 'Sí',
    Observaciones: 'Sin dato',
  })
  await expect(control(examen(), 'Actualizar')).toHaveCount(0)
  await control(page, 'Volver a hoy').click()
})

test('al actualizar queda una versión nueva', async () => {
  await control(examen(), 'Actualizar').click()
  const h = hoja(page)
  // Parte de la versión vigente.
  await expect(
    h.getByRole('group', { name: '¿Se cepilla la lengua?' }).getByLabel('Sí'),
  ).toBeChecked()
  await h.getByRole('group', { name: 'Tártaro' }).getByLabel('Sí').check()
  await h.getByRole('group', { name: 'Halitosis' }).getByLabel('Sin dato').check()
  await campo(h, 'Oclusión').fill('Clase II')
  await control(h, 'Guardar examen').click()
  await expect(h).toBeHidden()
  await expect.poll(respuestas).toMatchObject({
    Tártaro: 'Sí',
    Halitosis: 'Sin dato',
    Oclusión: 'Clase II',
  })
  await expect(examen()).toContainText(`Actualizado el ${numerica(hoy())} por`)
})

test('un paciente sin examen invita a cargarlo', async () => {
  await page.goto(`/pacientes/${LUCIA}/odontograma`)
  await expect(examen()).toContainText('Todavía no tiene examen bucal')
  await expect(control(examen(), 'Cargar examen')).toBeVisible()
})

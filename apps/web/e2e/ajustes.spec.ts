// Ajustes: lugares, horarios y tiempo de traslado (0002, 0004).
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, reiniciarBase, sql } from './apoyo/base'
import { dia } from './apoyo/fechas'
import { alerta, campo, cerrarHoja, control, entrarComoDemo, hoja } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  // Rocío en la clínica a la misma hora que Laura: la clínica no controla el sillón.
  await sql(
    `insert into citas (organization_id, profesional_id, lugar_id, nota, inicio, fin)
     values ($1, $2, $3, 'Cita de Rocío', ($4 || ' 15:00-04')::timestamptz, ($4 || ' 16:00-04')::timestamptz)`,
    [ID.organizacion, ID.rocio, ID.clinica, dia(1)],
  )
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, '/ajustes')
})

test.afterAll(() => page.close())

const lugares = () =>
  page
    .locator('section[aria-labelledby=titulo-lugares] > ul > li')
    .evaluateAll((filas) => filas.map((li) => li.querySelector('p')?.textContent))

/** Tramos de un día en la lista de horarios, o "No atiendes". */
const tramos = (nombre: string) =>
  page.locator('section[aria-labelledby=titulo-horarios] > ul > li').evaluateAll((filas, n) => {
    const li = filas.find((f) => f.querySelector('p')?.textContent === n)
    if (!li) return []
    return li.querySelector('ul')
      ? [...li.querySelectorAll('ul > li')].map((x) => x.textContent?.trim())
      : [li.querySelectorAll('p')[1]?.textContent]
  }, nombre)

test('lista los lugares y los horarios', async () => {
  await expect.poll(lugares).toEqual(['Clínica', 'Consultorio', 'Consultorio de Rocío'])
  expect(await tramos('Lunes')).toEqual([
    '10:00 – 13:00 · Consultorio',
    '15:00 – 21:00 · Consultorio',
  ])
  expect(await tramos('Sábado')).toEqual(['No atiendes'])
})

test('un lugar nuevo propone un color que no se usa', async () => {
  await control(page, 'Agregar lugar').click()
  await expect(h.locator('[role=radio][aria-checked=true]')).toHaveText('Amarillo')
  await campo(h, 'Nombre').fill('Consultorio de Ana')
  await control(h, 'Guardar lugar').click()
  await expect(h).toBeHidden()
  await expect.poll(lugares).toContain('Consultorio de Ana')
})

test('no deja marcar "un solo sillón" si ya hay citas superpuestas', async () => {
  await page
    .locator('section[aria-labelledby=titulo-lugares] > ul > li')
    .filter({ has: page.locator('p', { hasText: /^Clínica$/ }) })
    .getByRole('button')
    .first()
    .click()
  await h.locator('input[type=checkbox]').check()
  await control(h, 'Guardar lugar').click()
  await expect(alerta(h)).toHaveText(/^Ya hay citas que se superponen en este lugar\./)
  await cerrarHoja(page)
  await expect(h).toBeHidden()
})

test('agrega un horario el sábado', async () => {
  await control(page, 'Agregar horario').click()
  await control(h, 'Sábado').click()
  await campo(h, 'Desde').fill('09:00')
  await campo(h, 'Hasta').fill('12:00')
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio' })
  await control(h, 'Guardar horario').click()
  await expect(h).toBeHidden()
  await expect.poll(() => tramos('Sábado')).toEqual(['09:00 – 12:00 · Consultorio'])
})

test('no deja superponer horarios; "Lunes a viernes" elige esos días', async () => {
  await control(page, 'Agregar horario').click()
  await control(h, 'Lunes').click()
  await campo(h, 'Desde').fill('12:00')
  await campo(h, 'Hasta').fill('16:00')
  await control(h, 'Guardar horario').click()
  await expect(alerta(h)).toHaveText(
    'Ese horario se superpone con otro que ya tienes (lunes). Quita el anterior primero.',
  )
  await control(h, 'Lunes a viernes').click()
  const marcados = await h
    .locator('button[aria-pressed=true]')
    .evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')))
  expect(marcados).toEqual(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'])
  await cerrarHoja(page)
  await expect(h).toBeHidden()
})

test('la agenda ya sugiere horarios el sábado', async () => {
  await page.goto(`/?fecha=${dia(12)}`)
  await control(page, 'Agendar').click()
  const libres = h
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Horarios libres' }) })
  await expect(libres).toContainText('Consultorio')
  await expect(libres).toContainText('09:00')
})

test('quitar tramos los saca de la lista', async () => {
  await page.goto('/ajustes')
  await control(page, 'Quitar Lunes 15:00 – 21:00 · Consultorio').click()
  await expect.poll(() => tramos('Lunes')).toEqual(['10:00 – 13:00 · Consultorio'])
  await control(page, 'Quitar Sábado 09:00 – 12:00 · Consultorio').click()
  await expect.poll(() => tramos('Sábado')).toEqual(['No atiendes'])
})

test('guarda el tiempo de traslado', async () => {
  const traslado = page
    .locator('label')
    .filter({ hasText: /^\s*Tiempo para trasladarse/ })
    .locator('select')
  await traslado.selectOption('45')
  await expect
    .poll(async () => {
      await page.reload()
      return traslado.inputValue()
    })
    .toBe('45')
})

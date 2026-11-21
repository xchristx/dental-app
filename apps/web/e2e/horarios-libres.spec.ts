// Horarios libres y avisos al agendar (0004). Las citas del seed se pasan a la
// semana siguiente: los horarios libres de hoy empiezan desde ahora, y así el
// resultado no depende del día en que se corre.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { moverCitas, reiniciarBase } from './apoyo/base'
import { dia } from './apoyo/fechas'
import { CELULAR, cambiarFecha, campo, control, entrarComoDemo, hoja, valor } from './apoyo/pagina'

const MARTES = dia(8)
const SABADO = dia(12)

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await moverCitas(7)
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, `/?fecha=${MARTES}`)
})

test.afterAll(() => page.close())

/** "Consultorio: 11:30 11:45 | Clínica: 16:30", o el mensaje si no hay. */
const libres = () =>
  h.evaluate((raiz) => {
    const seccion = [...raiz.querySelectorAll('section')].find(
      (s) => s.querySelector('h3')?.textContent === 'Horarios libres',
    )
    if (!seccion) return ''
    const grupos = [...seccion.querySelectorAll(':scope > div')].map(
      (d) =>
        `${d.querySelector('p')?.textContent}: ` +
        [...d.querySelectorAll('button')].map((b) => b.textContent).join(' '),
    )
    return grupos.length ? grupos.join(' | ') : (seccion.querySelector('p')?.textContent ?? '')
  })

/** Avisos al pie del formulario. */
const avisos = () => h.locator('[data-slot=sheet-footer] li').allTextContents()

test('propone el lugar y el primer horario libre del día', async () => {
  // Martes: consultorio de 10 a 13 y clínica de 15 a 18.
  // Citas: 10-11 y 11:15-11:30 en el consultorio, 15-16:30 en la clínica.
  await control(page, 'Agendar').click()
  await expect(h).toBeVisible()
  await campo(h, 'Duración').selectOption({ label: '1 h' })
  await expect.poll(libres).toBe('Consultorio: 11:30 11:45 12:00 | Clínica: 16:30 16:45 17:00')
  expect(await valor(h, 'Hora')).toBe('11:30')
  expect(await valor(h, 'Lugar')).toBe('Consultorio')
})

test('con una duración más larga quedan menos horarios', async () => {
  await campo(h, 'Duración').selectOption({ label: '1 h 30 min' })
  await expect.poll(libres).toBe('Consultorio: 11:30 | Clínica: 16:30')
  await campo(h, 'Duración').selectOption({ label: '1 h' })
})

test('tocar un horario pone la hora y el lugar, sin avisos', async () => {
  const clinica = h
    .locator('section div')
    .filter({ has: page.locator('p', { hasText: 'Clínica' }) })
  await clinica.getByRole('button', { name: '16:30' }).click()
  expect(await valor(h, 'Hora')).toBe('16:30')
  expect(await valor(h, 'Lugar')).toBe('Clínica')
  expect(await avisos()).toEqual([])
})

test('fuera de horario avisa y deja "Agendar igual"', async () => {
  await campo(h, 'Hora').fill('19:00')
  await expect.poll(avisos).toEqual(['Está fuera del horario de atención en Clínica ese día.'])
  await expect(h.locator('button[type=submit]')).toHaveText('Agendar igual')
})

test('avisa cuando no alcanza el tiempo para el traslado', async () => {
  await campo(h, 'Hora').fill('11:45')
  await expect
    .poll(async () => (await avisos()).join(' / '))
    .toContain(
      'Justo antes hay una cita en Consultorio: quedan 15 min para el traslado (el margen es de 30 min).',
    )
})

test('un día sin horario lo dice', async () => {
  await cambiarFecha(h, SABADO)
  await expect.poll(libres).toMatch(/^Dra\. Laura Méndez no tiene horario de atención ese día\./)
})

test('en el celular, los mismos horarios libres', async () => {
  await page.setViewportSize(CELULAR)
  await page.goto(`/?fecha=${MARTES}`)
  await control(page, 'Agendar').click()
  await campo(h, 'Duración').selectOption({ label: '1 h' })
  await expect.poll(libres).toBe('Consultorio: 11:30 11:45 12:00 | Clínica: 16:30 16:45 17:00')
})

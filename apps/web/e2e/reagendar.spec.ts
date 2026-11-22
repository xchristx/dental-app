// Reagendar (0012). El seed se pasa a la semana anterior (todas sus citas ya
// pasaron), salvo Gabriel y Paola, que van al viernes de la semana siguiente.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase } from './apoyo/base'
import { dia, diaEnFrase, diaLargo, hoy } from './apoyo/fechas'
import {
  abrirCita,
  alerta,
  botones,
  buscarPaciente,
  cambiarFecha,
  campo,
  cerrarHoja,
  control,
  datos,
  descripcion,
  entrarComoDemo,
  hoja,
  principal,
  titulo,
  valor,
} from './apoyo/pagina'

const MARTES_PASADO = dia(-6)
const MIERCOLES_PASADO = dia(-5)
const JUEVES_PASADO = dia(-4)
const LUNES_PASADO = dia(-7)
const VIERNES = dia(11)

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await moverCitas(-7)
  await moverCitas(14, [ID.cita.gabrielViernes, ID.cita.paolaViernes])
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, `/?fecha=${MARTES_PASADO}`)
})

test.afterAll(() => page.close())

const enviar = () => h.locator('button[type=submit]').click()

test('una cita que ya pasó: el formulario dice que queda como "No asistió"', async () => {
  await abrirCita(page, 'Valeria Gutiérrez')
  await control(h, 'Reagendar').click()
  await expect(titulo(h)).toHaveText('Reagendar a Valeria Gutiérrez')
  await expect(descripcion(h)).toHaveText(
    `La cita del ${diaEnFrase(MARTES_PASADO)} a las 15:00 queda como «No asistió».`,
  )
  await expect(buscarPaciente(h), 'no pide elegir paciente').toHaveCount(0)
  await expect(h.getByRole('radiogroup'), 'ni cita o bloqueo').toHaveCount(0)
  // El día de la cita ya pasó: empieza hoy, con el mismo tipo y duración.
  expect(await campo(h, 'Fecha').inputValue()).toBe(hoy())
  expect(await valor(h, 'Tipo de cita')).toBe('Cirugía')
  expect(await valor(h, 'Duración')).toBe('1 h 30 min')
})

test('al guardar abre la cita nueva, que dice de dónde viene', async () => {
  await cambiarFecha(h, VIERNES)
  await campo(h, 'Hora').fill('15:00')
  await campo(h, 'Lugar').selectOption({ label: 'Clínica' })
  await enviar()
  await expect(page).toHaveURL(new RegExp(`fecha=${VIERNES}&cita=`))
  await expect(titulo(h)).toHaveText('Valeria Gutiérrez')
  await expect(descripcion(h)).toHaveText(`${diaLargo(VIERNES)} · 15:00 – 16:30`)
  expect(await datos(h)).toMatchObject({
    'Reagendada desde': `${diaLargo(MARTES_PASADO)} · 15:00`,
    Estado: 'Agendada',
    Tipo: 'Cirugía',
    Lugar: 'Clínica',
  })
})

test('la original quedó como "No asistió", enlaza a la nueva y no se reagenda otra vez', async () => {
  await control(h, `${diaLargo(MARTES_PASADO)} · 15:00`).click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('No asistió')
  expect((await datos(h))['Reagendada para']).toBe(`${diaLargo(VIERNES)} · 15:00`)
  const b = await botones(h)
  expect(b).not.toContain('Reagendar')
  expect(b.filter((t) => t.startsWith('Deshacer'))).toEqual([])
})

test('una cita que todavía no llegó queda cancelada y su horario cuenta como libre', async () => {
  await page.goto(`/?fecha=${VIERNES}`)
  await abrirCita(page, 'Gabriel Ortiz')
  await control(h, 'Reagendar').click()
  await expect(descripcion(h)).toHaveText(/queda cancelada\.$/)
  expect(await campo(h, 'Fecha').inputValue(), 'empieza el día de la cita').toBe(VIERNES)
  await expect(h.locator('button[aria-pressed]', { hasText: /^10:00$/ })).toHaveCount(1)
})

test('media hora más tarde en el mismo sillón funciona', async () => {
  await campo(h, 'Hora').fill('10:30')
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio' })
  await enviar()
  await expect(descripcion(h)).toHaveText(`${diaLargo(VIERNES)} · 10:30 – 11:30`)
  expect((await datos(h))['Reagendada desde']).toBe(`${diaLargo(VIERNES)} · 10:00`)
  await control(h, `${diaLargo(VIERNES)} · 10:00`).click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Cancelada')
})

test('si choca con otra cita, no cambia nada', async () => {
  await page.goto(`/?fecha=${MIERCOLES_PASADO}`)
  await abrirCita(page, 'Diego Torrez')
  await control(h, 'Reagendar').click()
  await cambiarFecha(h, VIERNES)
  await campo(h, 'Hora').fill('11:00')
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio' })
  await enviar()
  await expect(alerta(h), 'el choque es con Gabriel, no con la original').toHaveText(
    'Ya tienes una cita de 10:30 a 11:30 en Consultorio (Gabriel Ortiz).',
  )
  await cerrarHoja(page)
  await expect(titulo(h), 'al cerrar vuelve al detalle').toHaveText('Diego Torrez')
  expect((await datos(h)).Estado).toBe('Agendada')
})

test('no se reagendan los bloqueos ni las citas atendidas', async () => {
  await page.goto(`/?fecha=${JUEVES_PASADO}`)
  await abrirCita(page, 'Trámite en el banco')
  await expect(control(h, 'Cancelar bloqueo')).toBeVisible()
  expect(await botones(h)).not.toContain('Reagendar')
  await page.goto(`/?fecha=${LUNES_PASADO}`)
  await abrirCita(page, 'Camila Vargas')
  await expect(control(h, 'Deshacer «Llegó»')).toBeVisible()
  expect(await botones(h)).not.toContain('Reagendar')
})

test('en una cancelada, "Reagendar" va primero y "Deshacer la cancelación" sigue', async () => {
  await page.goto(`/?fecha=${VIERNES}`)
  await abrirCita(page, 'Paola Arce')
  await expect(control(h, 'Reagendar')).toBeVisible()
  const b = await botones(h)
  expect(b.filter((t) => t === 'Reagendar' || t === 'Deshacer la cancelación')).toEqual([
    'Reagendar',
    'Deshacer la cancelación',
  ])
})

test('en la ficha, la original dice "Reagendada" y la nueva está en próximas', async () => {
  await page.goto('/pacientes')
  await principal(page).locator('ul li a').filter({ hasText: 'Valeria' }).click()
  const filas = (seccion: string) =>
    page
      .locator(`section[aria-label="${seccion}"] li`)
      .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n/g, ' | ')))
  await expect.poll(() => filas('Historial de citas')).toHaveLength(1)
  expect((await filas('Historial de citas'))[0]).toMatch(/Reagendada.*No asistió$/)
  const proximas = await filas('Próximas citas')
  expect(proximas).toHaveLength(1)
  expect(proximas[0]).toMatch(new RegExp(`^${diaLargo(VIERNES)} · 15:00`))
})

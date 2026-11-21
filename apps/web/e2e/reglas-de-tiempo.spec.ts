// Qué se puede marcar y cuándo, y el aviso de llegada tarde (0013).
// Las citas de hoy se crean alrededor de la hora actual. Del seed quedan
// Gabriel en la semana siguiente y Jorge en la anterior; las demás de hoy se borran.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase, sql } from './apoyo/base'
import { dia, hoy, horaLocal, minutosDelDia, sumarDias } from './apoyo/fechas'
import {
  abrirCita,
  alerta,
  botones,
  cambiarFecha,
  campo,
  control,
  datos,
  descripcion,
  entrarComoDemo,
  hoja,
} from './apoyo/pagina'

const A = '70000000-0000-4000-8000-000000000001'
const B = '70000000-0000-4000-8000-000000000002'
const C = '70000000-0000-4000-8000-000000000003'
const VIERNES = dia(11)
const MARTES_PASADO = dia(-6)
const HACE_TRES_DIAS = sumarDias(hoy(), -3)

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  // Las citas de hoy van de media hora antes a una hora después de ahora.
  const m = minutosDelDia()
  test.skip(m < 60 || m > 22 * 60, 'Muy cerca de la medianoche en La Paz')
  await reiniciarBase()
  await moverCitas(7, [ID.cita.gabrielViernes])
  await moverCitas(-7, [ID.cita.jorgeMartes])
  await sql(
    `update citas set deleted_at = now()
     where (inicio at time zone 'America/La_Paz')::date = $1::date`,
    [hoy()],
  )
  await sql(`update pacientes set telefono = '71234567' where id = $1`, [ID.jorge])
  // A: Lucía, empezó hace 30 min. B: Jorge, después de A. C: Sofía con Rocío, en otro lugar.
  await sql(
    `insert into citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin)
     select v.id::uuid, $1, v.profesional::uuid, v.lugar::uuid, v.paciente::uuid,
            date_trunc('minute', now()) + v.desde::interval, date_trunc('minute', now()) + v.hasta::interval
     from (values
       ($2, $5, $7, $9, '-30 min', '30 min'),
       ($3, $5, $7, $10, '42 min', '57 min'),
       ($4, $6, $8, $11, '-30 min', '30 min')
     ) as v(id, profesional, lugar, paciente, desde, hasta)`,
    [
      ID.organizacion,
      A,
      B,
      C,
      ID.laura,
      ID.rocio,
      ID.consultorio,
      ID.consultorioRocio,
      ID.lucia,
      ID.jorge,
      ID.sofia,
    ],
  )
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page)
})

test.afterAll(() => page?.close())

const aviso = () => h.locator('section[aria-label="Llegada tarde"]')
const finDe = (texto: string) => texto.split('–')[1]?.trim()

test('una cita de otro día no ofrece "Llegó" ni "No asistió", sí confirmar y reagendar', async () => {
  await page.goto(`/?fecha=${VIERNES}`)
  await abrirCita(page, 'Gabriel Ortiz')
  await expect(control(h, 'Confirmó')).toBeVisible()
  const b = await botones(h)
  expect(b).not.toContain('Llegó')
  expect(b).not.toContain('No asistió')
  expect(b).toEqual(expect.arrayContaining(['Confirmó', 'Reagendar', 'Cancelar cita']))
})

test('una cita que ya pasó ofrece "Llegó" y "No asistió", pero no el recordatorio', async () => {
  await page.goto(`/?fecha=${MARTES_PASADO}`)
  await abrirCita(page, 'Jorge Mamani')
  await expect(control(h, 'No asistió')).toBeVisible()
  const b = await botones(h)
  expect(b).toContain('Llegó')
  expect(b.filter((t) => t.includes('recordatorio') || t === 'Guardar celular')).toEqual([])
  expect(await datos(h), 'sin recordatorio enviado no hay fila').not.toHaveProperty('Recordatorio')
})

test('llega tarde y atrasa la siguiente: avisa y ofrece escribirle', async () => {
  await page.goto(`/?cita=${A}`)
  await control(h, 'Llegó').click()
  await expect(aviso()).toContainText(/Llegó 3[01] min tarde\./)
  expect(await campo(h, 'Hora de llegada').inputValue()).toMatch(/^\d\d:\d\d$/)
  const texto = await aviso().innerText()
  expect(texto).toMatch(/terminas a las \d\d:\d\d/)
  expect(texto).toMatch(
    /La cita de Jorge Mamani a las \d\d:\d\d empezaría unos (1[89]|20) min tarde\./,
  )
  const wa =
    (await aviso()
      .getByRole('link', { name: /Avisar a Jorge/ })
      .getAttribute('href')) ?? ''
  expect(wa).toMatch(/^https:\/\/wa\.me\/59171234567/)
  expect(decodeURIComponent(wa.split('text=')[1] ?? '')).toMatch(
    /^Hola, Jorge\. Te escribo para avisarte que tu cita de hoy a las \d\d:\d\d va a empezar unos 20 minutos tarde\. Disculpa la espera\.$/,
  )
  expect(
    (await botones(h)).some((t) => t.startsWith('Extender')),
    'pisaría a Jorge',
  ).toBe(false)
})

test('"Mantener el horario" cierra el aviso y no cambia la cita', async () => {
  const antes = await descripcion(h).innerText()
  await control(h, 'Mantener el horario').click()
  await expect(aviso()).toHaveCount(0)
  await expect(descripcion(h)).toHaveText(antes)
})

test('no se puede corregir la llegada a una hora futura', async () => {
  await campo(h, 'Hora de llegada').fill(horaLocal(new Date(Date.now() + 3600_000)))
  await control(h, 'Corregir').click()
  await expect(alerta(h)).toHaveText('La hora de llegada no puede ser más tarde que ahora.')
})

test('si no atrasa a nadie, se puede extender la cita y deshacerlo', async () => {
  await page.goto(`/?cita=${C}`)
  const acordada = await descripcion(h).innerText()
  await control(h, 'Llegó').click()
  await expect(aviso()).toContainText('Después no tienes otra cita que se atrase.')
  const termina = (await aviso().innerText()).match(/terminas a las (\d\d:\d\d)/)?.[1]
  expect(termina).toBeTruthy()
  await control(h, `Extender hasta las ${termina}`).click()
  await expect.poll(async () => finDe(await descripcion(h).innerText())).toBe(termina)
  expect((await datos(h))['Fin acordado']).toBe(
    `${finDe(acordada)} · se extendió por la llegada tarde`,
  )
  await expect(aviso(), 'ya extendida, no vuelve a avisar').toHaveCount(0)
  await control(h, 'Deshacer «Llegó»').click()
  await expect(descripcion(h)).toHaveText(acordada)
  expect(await datos(h)).not.toHaveProperty('Fin acordado')
})

test('agendar en una hora pasada se permite con aviso', async () => {
  await page.goto('/')
  await control(page, 'Agendar').click()
  await cambiarFecha(h, HACE_TRES_DIAS)
  await campo(h, 'Hora').fill('09:00')
  await expect(h).toContainText(
    'Esa hora ya pasó. Puedes agendarla igual para anotar una cita que ya ocurrió.',
  )
  await expect(h.locator('button[type=submit]')).toHaveText('Agendar igual')
})

test('reagendar a una hora pasada no se permite', async () => {
  await page.goto(`/?fecha=${VIERNES}`)
  await abrirCita(page, 'Gabriel Ortiz')
  await control(h, 'Reagendar').click()
  await cambiarFecha(h, HACE_TRES_DIAS)
  await campo(h, 'Hora').fill('09:00')
  await h.locator('button[type=submit]').click()
  await expect(alerta(h)).toHaveText('Elige un horario que todavía no haya pasado.')
})

test('una fecha de nacimiento futura da error', async () => {
  await page.goto('/pacientes')
  await control(page, 'Agregar paciente').click()
  await campo(h, 'Nombre').fill('Carla Rivas')
  await campo(h, 'Fecha de nacimiento').fill('2999-01-01')
  await h.locator('button[type=submit]').click()
  await expect(alerta(h)).toHaveText('La fecha de nacimiento no puede ser futura.')
})

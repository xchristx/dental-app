// Detalle de una cita: datos, recordatorio, estados y cancelación (0005, 0013).
// "Confirmó" vale antes de la hora y "Llegó" desde el mismo día, así que la
// cita de Andrés se pasa a hoy, media hora más tarde. El resto del seed va a
// la semana siguiente para que hoy no haya otras citas.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase, sql } from './apoyo/base'
import { dia, diaEnFrase, diaLargo, hoy, horaLocal, minutosDelDia } from './apoyo/fechas'
import {
  CELULAR,
  abrirCita,
  alerta,
  botones,
  campo,
  cerrarHoja,
  citasVisibles,
  control,
  datos,
  descripcion,
  entrarComoDemo,
  hoja,
  titulo,
} from './apoyo/pagina'

const JUEVES = dia(10)
const VIERNES = dia(11)

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator
let inicio: Date
let fin: Date

test.beforeAll(async ({ browser }) => {
  // La cita tiene que empezar hoy, dentro de media hora.
  test.skip(minutosDelDia() > 23 * 60 + 20, 'Muy cerca de la medianoche en La Paz')
  await reiniciarBase()
  await moverCitas(7)
  const ahora = new Date()
  inicio = new Date(Math.ceil(ahora.getTime() / 300_000) * 300_000 + 30 * 60_000)
  fin = new Date(inicio.getTime() + 90 * 60_000)
  await sql('update citas set inicio = $2, fin = $3 where id = $1', [
    ID.cita.andresJueves,
    inicio,
    fin,
  ])
  // Gabriel ocupa el horario de Paola (cancelada): reactivarla choca.
  await sql(
    `insert into citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin)
     values ($1, $2, $3, $4, ($5 || ' 18:00-04')::timestamptz, ($5 || ' 19:00-04')::timestamptz)`,
    [ID.organizacion, ID.laura, ID.consultorio, ID.gabriel, VIERNES],
  )
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page)
})

test.afterAll(() => page?.close())

test('tocar una cita abre su detalle y lo pone en la URL', async () => {
  await abrirCita(page, 'Andrés Quiroga')
  await expect(page).toHaveURL(/cita=/)
  await expect(titulo(h)).toHaveText('Andrés Quiroga')
  await expect(descripcion(h)).toHaveText(
    `${diaLargo(hoy())} · ${horaLocal(inicio)} – ${horaLocal(fin)}`,
  )
  expect(await datos(h)).toMatchObject({
    Estado: 'Agendada',
    Tipo: 'Cirugía',
    Lugar: 'Clínica',
    Profesional: 'Dra. Laura Méndez · Odontología general',
    Recordatorio: 'Todavía no se envió',
  })
})

test('un celular inválido muestra un error claro', async () => {
  await campo(h, 'Celular del paciente').fill('123')
  await control(h, 'Guardar celular').click()
  await expect(alerta(h)).toHaveText(/^Ese número no parece un celular/)
})

test('con celular, "Enviar recordatorio" abre WhatsApp con el mensaje escrito', async () => {
  await campo(h, 'Celular del paciente').fill('7123 4567')
  await control(h, 'Guardar celular').click()
  const enlace = h.getByRole('link', { name: 'Enviar recordatorio' })
  await expect(enlace).toHaveAttribute('href', /^https:\/\/wa\.me\/59171234567\?text=/)
  const href = (await enlace.getAttribute('href')) ?? ''
  expect(decodeURIComponent(href.split('text=')[1])).toBe(
    `Hola, Andrés. Te escribo para recordarte tu cita de cirugía el ${diaEnFrase(hoy())} ` +
      `a las ${horaLocal(inicio)} en Clínica. ¿Me confirmas si puedes venir? ¡Gracias!`,
  )
  // Abre WhatsApp en otra pestaña; aquí solo importa que quede anotado.
  const pestaña = page.context().waitForEvent('page')
  await enlace.click()
  await (await pestaña).close()
  await expect
    .poll(async () => (await datos(h)).Recordatorio)
    .toMatch(new RegExp(`^Enviado el ${diaEnFrase(hoy())} a las`))
})

test('"Confirmó" cambia el estado y la agenda lo muestra', async () => {
  await control(h, 'Confirmó').click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Confirmada')
  await expect(
    citasVisibles(page, diaLargo(hoy())).filter({ hasText: 'Andrés Quiroga' }),
  ).toContainText('Confirmada')
})

test('"Llegó" la marca como atendida y guarda la hora', async () => {
  await control(h, 'Llegó').click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Atendida')
  expect((await datos(h)).Llegada).toMatch(/^\d\d:\d\d · Llegó/)
})

test('se puede corregir la hora de llegada', async () => {
  // La llegada no puede ser futura (0013): se corrige a hace un minuto.
  const haceUnMinuto = horaLocal(new Date(Date.now() - 60_000))
  await campo(h, 'Hora de llegada').fill(haceUnMinuto)
  await control(h, 'Corregir').click()
  await expect
    .poll(async () => (await datos(h)).Llegada)
    .toMatch(new RegExp(`^${haceUnMinuto} · Llegó .* antes$`))
})

test('"Deshacer «Llegó»" vuelve a agendada y borra la llegada', async () => {
  await control(h, 'Deshacer «Llegó»').click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Agendada')
  expect(await datos(h)).not.toHaveProperty('Llegada')
})

test('cancelar pide confirmación y se puede deshacer', async () => {
  await control(h, 'Cancelar cita').click()
  await control(h, 'Sí, cancelar').click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Cancelada')
  await control(h, 'Deshacer la cancelación').click()
  await expect.poll(async () => (await datos(h)).Estado).toBe('Agendada')
})

test('Escape cierra el detalle y lo saca de la URL', async () => {
  await cerrarHoja(page)
  await expect(h).toBeHidden()
  await expect(page).not.toHaveURL(/cita=/)
})

test('un bloqueo no tiene "Llegó" ni recordatorio, sí "Cancelar bloqueo"', async () => {
  await page.goto(`/?fecha=${JUEVES}`)
  await abrirCita(page, 'Trámite en el banco')
  await expect(control(h, 'Cancelar bloqueo')).toBeVisible()
  const b = await botones(h)
  expect(b).not.toContain('Llegó')
  expect(b.filter((t) => t.includes('recordatorio'))).toEqual([])
})

test('reactivar una cita cuyo horario ya está ocupado explica el choque', async () => {
  await page.goto(`/?fecha=${VIERNES}`)
  await abrirCita(page, 'Paola Arce')
  await control(h, 'Deshacer la cancelación').click()
  await expect(alerta(h)).toHaveText(
    'No se puede volver a agendar: Ya tienes una cita de 18:00 a 19:00 en Consultorio (Gabriel Ortiz).',
  )
})

test('en el celular, con la profesional de la cita', async () => {
  await page.setViewportSize(CELULAR)
  await page.goto(`/?fecha=${JUEVES}`)
  await abrirCita(page, 'Mateo Flores')
  await expect(titulo(h)).toHaveText('Mateo Flores')
  expect((await datos(h)).Profesional).toBe('Dra. Rocío Paz · Ortodoncia')
})

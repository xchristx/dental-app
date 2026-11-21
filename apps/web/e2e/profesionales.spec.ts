// Profesionales en Ajustes (0014). El seed se pasa a la semana anterior, así la
// única cita pendiente de Rocío es la que se crea para la semana que viene.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase, sql } from './apoyo/base'
import { dia } from './apoyo/fechas'
import {
  alerta,
  botones,
  campo,
  cerrarHoja,
  control,
  entrarComoDemo,
  hoja,
  titulo,
} from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await moverCitas(-7)
  await sql(
    `insert into citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin)
     values ($1, $2, $3, $4, ($5 || ' 12:00-04')::timestamptz, ($5 || ' 13:00-04')::timestamptz)`,
    [ID.organizacion, ID.rocio, ID.consultorioRocio, ID.sofia, dia(11)],
  )
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, '/ajustes')
})

test.afterAll(() => page.close())

const lista = () => page.locator('section[aria-labelledby=titulo-profesionales] li')
const filas = () =>
  lista().evaluateAll((li) =>
    li.map((x) => (x as HTMLElement).innerText.replace(/\s*\n+\s*/g, ' | ')),
  )
const editar = (nombre: string) =>
  lista().filter({ hasText: nombre }).getByRole('button').first().click()
const enviar = () => h.locator('button[type=submit]').click()
const opcionesProfesional = () => campo(h, 'Profesional').locator('option').allTextContents()

test('lista a las profesionales con su especialidad y marca quién eres', async () => {
  await expect
    .poll(filas)
    .toEqual([
      'Dra. Laura Méndez Tú | Odontología general | Editar',
      'Dra. Rocío Paz | Ortodoncia | Editar',
    ])
})

test('agregar una profesional: pide nombre y aparece en orden', async () => {
  await control(page, 'Agregar profesional').click()
  await expect(titulo(h)).toHaveText('Nueva profesional')
  await campo(h, 'Nombre').fill('D')
  await enviar()
  await expect(alerta(h)).toHaveText('Escribe el nombre de la profesional.')
  await campo(h, 'Nombre').fill('Dra. Ana Rojas')
  await campo(h, 'Especialidad').fill('Implantología')
  await enviar()
  await expect.poll(async () => (await filas())[0]).toBe('Dra. Ana Rojas | Implantología | Editar')
  expect(await filas()).toHaveLength(3)
  const horariosDe = page
    .locator('label')
    .filter({ hasText: /^\s*Horario de/ })
    .locator('select option')
  await expect(horariosDe, 'se le pueden cargar horarios').toContainText(['Dra. Ana Rojas'])
})

test('al agendar se elige con su especialidad', async () => {
  await page.goto('/')
  await control(page, 'Agendar').click()
  await expect
    .poll(opcionesProfesional)
    .toEqual(
      expect.arrayContaining(['Dra. Ana Rojas · Implantología', 'Dra. Rocío Paz · Ortodoncia']),
    )
})

test('editar la especialidad', async () => {
  await page.goto('/ajustes')
  await editar('Dra. Rocío Paz')
  await expect(campo(h, 'Especialidad')).toHaveValue('Ortodoncia')
  await campo(h, 'Especialidad').fill('Ortodoncia e implantes')
  await enviar()
  await expect.poll(filas).toContain('Dra. Rocío Paz | Ortodoncia e implantes | Editar')
})

test('con una cita pendiente no se da de baja, y lo explica', async () => {
  await editar('Dra. Rocío Paz')
  await control(h, 'Dar de baja').click()
  await control(h, 'Sí, dar de baja').click()
  await expect(alerta(h)).toHaveText(
    'Tiene una cita pendiente. Reagéndala o cancélala antes de darla de baja.',
  )
  await cerrarHoja(page)
  await expect(h).toBeHidden()
})

test('a quien tiene usuario no se la da de baja desde aquí', async () => {
  await editar('Dra. Laura Méndez')
  await expect(h).toContainText('Tiene un usuario para entrar a la app')
  expect(await botones(h)).not.toContain('Dar de baja')
  await cerrarHoja(page)
  await expect(h).toBeHidden()
})

test('sin citas pendientes se da de baja y ya no aparece al agendar', async () => {
  await editar('Dra. Ana Rojas')
  await control(h, 'Dar de baja').click()
  await control(h, 'Sí, dar de baja').click()
  await expect.poll(filas).toHaveLength(2)
  expect((await filas()).some((f) => f.includes('Ana Rojas'))).toBe(false)
  await page.goto('/')
  await control(page, 'Agendar').click()
  await expect.poll(opcionesProfesional).toContain('Dra. Rocío Paz · Ortodoncia e implantes')
  expect((await opcionesProfesional()).some((o) => o.includes('Ana Rojas'))).toBe(false)
})

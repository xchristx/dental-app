// Pacientes: lista, búsqueda, ficha y edición. Las citas del seed se pasan a la
// semana anterior para que estén en el historial y no en "Próximas citas", y
// la de Gabriel a la semana siguiente.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase, sql } from './apoyo/base'
import { dia, diaLargo, edad } from './apoyo/fechas'
import {
  alerta,
  buscarPaciente,
  campo,
  control,
  entrarComoDemo,
  hoja,
  principal,
  titulo,
} from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await moverCitas(-7)
  await moverCitas(14, [ID.cita.gabrielViernes])
  // Dos citas más de Lucía, dos y tres semanas antes: llegó 20 y 30 min tarde.
  await sql(
    `insert into citas (organization_id, profesional_id, lugar_id, paciente_id, tipo_cita_id, estado, inicio, fin, llegada_at)
     select $1, $2, $3, $4, $5, 'atendida', (d || ' 10:00-04')::timestamptz,
            (d || ' 11:00-04')::timestamptz, (d || ' ' || llegada || '-04')::timestamptz
     from (values ($6::text, '10:20'), ($7::text, '10:30')) as v(d, llegada)`,
    [ID.organizacion, ID.laura, ID.consultorio, ID.lucia, ID.control, dia(-13), dia(-20)],
  )
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, '/pacientes')
})

test.afterAll(() => page.close())

const nombres = () => principal(page).locator('ul li a p.font-medium').allTextContents()
const filas = (seccion: string) =>
  page
    .locator(`section[aria-label="${seccion}"] li`)
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n/g, ' | ')))
const abrirPaciente = (nombre: string) =>
  principal(page).locator('ul li a').filter({ hasText: nombre }).click()

test('lista los pacientes en orden, con celular y edad', async () => {
  await expect.poll(nombres).toHaveLength(11)
  const n = await nombres()
  expect(n[0]).toBe('Andrés Quiroga')
  expect(n[10]).toBe('Valeria Gutiérrez')
  const fila = principal(page).locator('ul li a').filter({ hasText: 'Andrés' })
  // "AQ" es el monograma: se ve, pero no es parte del nombre accesible (0032).
  expect((await fila.innerText()).replace(/\n+/g, ' | ')).toBe(
    `AQ | Andrés Quiroga | Sin celular · ${edad('1993-04-21')} años`,
  )
  await expect(fila).toHaveAccessibleName(`Andrés Quiroga Sin celular · ${edad('1993-04-21')} años`)
  await expect(principal(page)).toContainText('11 pacientes')
})

test('la búsqueda ignora tildes y busca por partes', async () => {
  await buscarPaciente(page).fill('luc fer')
  await expect.poll(nombres).toEqual(['Lucía Fernández'])
  await expect(principal(page)).toContainText('1 de 11 pacientes')
  await buscarPaciente(page).fill('zzz')
  await expect(principal(page)).toContainText('Nadie con ese nombre.')
  await buscarPaciente(page).fill('lucia')
})

test('la ficha dice cómo suele llegar, la edad y el historial', async () => {
  await abrirPaciente('Lucía')
  await expect(page.getByRole('heading', { level: 1, name: 'Lucía Fernández' })).toBeVisible()
  await expect(page).toHaveURL(/\/pacientes\//)
  const main = principal(page)
  await expect(main, 'mediana de 3 citas').toContainText(
    'Suele llegar 25 min tarde (según 3 citas)',
  )
  await expect(main).toContainText(`23/11/1998 · ${edad('1998-11-23')} años`)
  await expect(main).toContainText('No tiene citas agendadas.')
  await expect.poll(() => filas('Historial de citas')).toHaveLength(3)
  const historial = await filas('Historial de citas')
  expect(historial[0]).toMatch(new RegExp(`^${diaLargo(dia(-6))} · 10:00.*Atendida$`))
  await expect(page.locator('aside a[aria-current=page]')).toHaveText('Pacientes')
})

test('editar el celular: valida y ofrece WhatsApp', async () => {
  await control(page, 'Editar').click()
  await campo(h, 'Celular').fill('123')
  await control(h, 'Guardar paciente').click()
  await expect(alerta(h)).toHaveText(/^Ese número no parece un celular/)
  await campo(h, 'Celular').fill('71234567')
  await control(h, 'Guardar paciente').click()
  await expect(h).toBeHidden()
  await expect(principal(page)).toContainText('71234567')
  await expect(page.locator('a[aria-label="Escribirle por WhatsApp"]')).toHaveAttribute(
    'href',
    'https://wa.me/59171234567',
  )
})

test('una cita del historial abre su detalle en la agenda', async () => {
  await page.locator('section[aria-label="Historial de citas"] li a').first().click()
  await expect(page).toHaveURL(/cita=/)
  await expect(titulo(h)).toHaveText('Lucía Fernández')
})

test('muestra las próximas citas con su estado', async () => {
  await page.goto('/pacientes')
  await abrirPaciente('Gabriel')
  await expect(page.getByRole('heading', { level: 1, name: 'Gabriel Ortiz' })).toBeVisible()
  await expect.poll(() => filas('Próximas citas')).toHaveLength(1)
  const proximas = await filas('Próximas citas')
  expect(proximas[0]).toMatch(new RegExp(`^${diaLargo(dia(11))} · 10:00.*Agendada$`))
})

test('un paciente nuevo lleva a su ficha y aparece en la lista', async () => {
  await page.goto('/pacientes')
  await control(page, 'Agregar paciente').click()
  await campo(h, 'Nombre').fill('Carla Rivas')
  await control(h, 'Guardar paciente').click()
  await expect(page.getByRole('heading', { level: 1, name: 'Carla Rivas' })).toBeVisible()
  await expect(principal(page)).toContainText('Todavía no tuvo citas.')
  await page.goto('/pacientes')
  await expect(principal(page)).toContainText('12 pacientes')
  await expect.poll(nombres).toContain('Carla Rivas')
})

test('"Agendar" usa la misma búsqueda', async () => {
  await page.goto('/')
  await control(page, 'Agendar').click()
  await buscarPaciente(h).fill('luc fer')
  await expect(h.locator('ul li button')).toHaveText(['Lucía Fernández'])
})

test('un paciente que no existe da una página en español', async () => {
  await page.goto('/pacientes/00000000-0000-4000-8000-000000000000')
  await expect(page.getByText('No encontramos esta página')).toBeVisible()
})

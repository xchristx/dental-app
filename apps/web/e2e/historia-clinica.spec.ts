// Historia clínica (0018): alergias, anamnesis por versiones y evolución que
// se corrige solo el mismo día. Las citas del seed se pasan a la semana
// anterior, y la evolución del seed con ellas, para que ya no se pueda corregir.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { ID, moverCitas, reiniciarBase, sql } from './apoyo/base'
import { dia, hoy } from './apoyo/fechas'
import { alerta, campo, control, entrarComoDemo, hoja, principal, titulo } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const CAMILA = '50000000-0000-4000-8000-000000000001'
const MARTIN = '50000000-0000-4000-8000-000000000002'
const CITA_LUCIA = '60000000-0000-4000-8000-000000000003'
const CITA_MARTIN = '60000000-0000-4000-8000-000000000002'

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  await moverCitas(-7)
  await sql(`update evoluciones set fecha = fecha - 7, created_at = created_at - interval '7 days'`)
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, `/pacientes/${CAMILA}`)
})

test.afterAll(() => page.close())

const fechaNumerica = (f: string) => f.split('-').reverse().join('/')
const seccion = (nombre: string) => principal(page).getByRole('region', { name: nombre })
const entradas = (raiz: Locator) =>
  raiz
    .locator('ul > li')
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n+/g, ' | ')))

test('la ficha muestra las alergias en rojo, la anamnesis y la evolución', async () => {
  await expect(principal(page).locator('header')).toContainText('Alergias: Penicilina (urticaria).')
  const anamnesis = seccion('Anamnesis')
  await expect(anamnesis).toContainText('Sin enfermedades de base. Bruxismo nocturno.')
  await expect(anamnesis).toContainText('MedicamentosSin dato')
  await expect(anamnesis).toContainText(/Actualizada el \d{2}\/\d{2}\/\d{4} por Dra\. Laura Méndez/)

  const evolucion = seccion('Evolución')
  await expect.poll(() => entradas(evolucion)).toHaveLength(2)
  const [ultima] = await entradas(evolucion)
  expect(ultima).toBe(
    `${fechaNumerica(dia(-7))} · Dra. Laura Méndez · Ver cita | Control. Obturación OM en 36 con resina A2. Se indica placa de descanso por bruxismo.`,
  )
  // Escrita otro día: ya no se corrige.
  await expect(evolucion.getByRole('button', { name: /Corregir/ })).toHaveCount(0)
})

test('sin anamnesis avisa que faltan las alergias; cada guardado es una versión', async () => {
  await page.goto(`/pacientes/${ID.andres}`)
  const cabecera = principal(page).locator('header')
  await expect(cabecera).toContainText('Alergias sin registrar')

  await control(page, 'Cargar anamnesis').click()
  await expect(titulo(h)).toHaveText('Anamnesis')
  const sinAlergias = h.getByRole('checkbox', { name: 'Sin alergias conocidas' })
  await sinAlergias.check()
  // Escribir una alergia desmarca "Sin alergias conocidas".
  await campo(h, 'Alergias').fill('Látex')
  await expect(sinAlergias).not.toBeChecked()
  await campo(h, 'Medicamentos').fill('Ninguno')
  await control(h, 'Guardar anamnesis').click()
  await expect(h).toHaveCount(0)
  await expect(cabecera).toContainText('Alergias: Látex')
  await expect(seccion('Anamnesis')).toContainText(
    `Actualizada el ${fechaNumerica(hoy())} por Dra. Laura Méndez`,
  )

  await control(page, 'Actualizar').click()
  await expect(campo(h, 'Medicamentos')).toHaveValue('Ninguno')
  // Marcar "Sin alergias conocidas" borra lo escrito.
  await h.getByRole('checkbox', { name: 'Sin alergias conocidas' }).check()
  await expect(campo(h, 'Alergias')).toHaveValue('')
  await control(h, 'Guardar anamnesis').click()
  await expect(cabecera).toContainText('Sin alergias conocidas')

  const { rows } = await sql(
    'select alergias, sin_alergias from anamnesis where paciente_id = $1 order by created_at',
    [ID.andres],
  )
  expect(rows).toEqual([
    { alergias: 'Látex', sin_alergias: false },
    { alergias: null, sin_alergias: true },
  ])
})

test('una evolución se escribe, se corrige y se borra el mismo día', async () => {
  const evolucion = seccion('Evolución')
  await expect(evolucion).toContainText('Todavía no hay nada escrito.')

  await evolucion.getByRole('button', { name: 'Agregar' }).click()
  await expect(titulo(h)).toHaveText('Nueva evolución')
  await expect(campo(h, 'Fecha')).toHaveValue(hoy())
  await control(h, 'Guardar evolución').click()
  await expect(alerta(h)).toHaveText('Escribe qué se hizo.')

  await campo(h, 'Qué se hizo').fill('Llamó por dolor en 46. Se indica control.')
  await control(h, 'Guardar evolución').click()
  await expect(h).toHaveCount(0)
  await expect
    .poll(() => entradas(evolucion))
    .toEqual([
      `${fechaNumerica(hoy())} · Dra. Laura Méndez | Corregir | Llamó por dolor en 46. Se indica control.`,
    ])

  await evolucion.getByRole('button', { name: /Corregir/ }).click()
  await expect(titulo(h)).toHaveText('Corregir evolución')
  await campo(h, 'Qué se hizo').fill('Llamó por dolor en 46. Se agenda control.')
  await control(h, 'Guardar evolución').click()
  await expect(evolucion).toContainText('Se agenda control.')

  await evolucion.getByRole('button', { name: /Corregir/ }).click()
  await control(h, 'Borrar evolución').click()
  await control(h, 'Sí, borrar').click()
  await expect(h).toHaveCount(0)
  await expect(evolucion).toContainText('Todavía no hay nada escrito.')
})

test('desde el detalle de una cita atendida se escribe su evolución', async () => {
  await page.goto(`/?fecha=${dia(-6)}&cita=${CITA_LUCIA}`)
  await expect(titulo(h)).toHaveText('Lucía Fernández')
  await expect(h).toContainText('Alergias sin registrar')
  const evolucion = h.getByRole('region', { name: 'Evolución' })
  await expect(evolucion).toContainText('Control. Sin caries nuevas. Tartrectomía y pulido.')

  await control(evolucion, 'Agregar otra').click()
  await expect(titulo(h)).toHaveText('Nueva evolución')
  await expect(campo(h, 'Cita')).toHaveValue(CITA_LUCIA)
  await expect(campo(h, 'Fecha')).toHaveValue(dia(-6))
  await campo(h, 'Qué se hizo').fill('Se indica control en 6 meses.')
  await control(h, 'Guardar evolución').click()

  // Vuelve al detalle de la cita, con la entrada nueva.
  await expect(titulo(h)).toHaveText('Lucía Fernández')
  const nueva = h.getByRole('region', { name: 'Evolución' })
  await expect.poll(() => entradas(nueva)).toHaveLength(2)
  await expect(nueva.locator('li').first()).toContainText('Se indica control en 6 meses.')

  const { rows } = await sql('select cita_id, fecha::text from evoluciones where texto like $1', [
    'Se indica control%',
  ])
  expect(rows).toEqual([{ cita_id: CITA_LUCIA, fecha: dia(-6) }])
})

test('el detalle de la cita dice si no tiene alergias conocidas y lleva a la ficha', async () => {
  await page.goto(`/?fecha=${dia(-7)}&cita=${CITA_MARTIN}`)
  await expect(titulo(h)).toHaveText('Martín Salazar')
  await expect(h).toContainText('Sin alergias conocidas')
  await control(h, 'Ver ficha y antecedentes').click()
  await expect(page).toHaveURL(new RegExp(`/pacientes/${MARTIN}$`))
  await expect(seccion('Anamnesis')).toContainText('Losartán 50 mg, una vez al día.')
})

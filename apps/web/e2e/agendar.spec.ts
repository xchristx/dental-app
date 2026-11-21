// Agendar citas y bloqueos, y los choques que impide Postgres (0002).
// Todo pasa el sábado de la semana siguiente: un día futuro y sin citas.
import { expect, test, type Locator, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { dia, diaLargo } from './apoyo/fechas'
import {
  CELULAR,
  alerta,
  buscarPaciente,
  cambiarFecha,
  campo,
  citasVisibles,
  control,
  entrarComoDemo,
  hoja,
} from './apoyo/pagina'

const SABADO = dia(12)
const OTRO_SABADO = dia(19)

test.describe.configure({ mode: 'serial' })

let page: Page
let h: Locator

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage()
  h = hoja(page)
  await entrarComoDemo(page, `/?fecha=${SABADO}`)
})

test.afterAll(() => page.close())

const delSabado = () => citasVisibles(page, diaLargo(SABADO))
const enviar = () => h.locator('button[type=submit]').click()

test('una cita con un paciente que ya existe', async () => {
  await expect(delSabado()).toHaveCount(0)
  await control(page, 'Agendar').click()
  await expect(h).toContainText('Nueva cita')

  await enviar()
  await expect(alerta(h)).toHaveText('Elige un paciente o agrega uno nuevo.')

  await buscarPaciente(h).fill('lucia')
  await control(h, 'Lucía Fernández').click()
  await expect(h).toContainText('Lucía Fernández')
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio' })
  await campo(h, 'Tipo de cita').selectOption({ label: 'Cirugía' })
  await expect(h, 'cirugía sugiere 1 h 30 min').toContainText('De 10:00 a 11:30')

  await enviar()
  await expect(h).toBeHidden()
  await expect(delSabado()).toHaveCount(1)
  await expect(delSabado()).toContainText(['Lucía Fernández'])
})

test('choque con la propia agenda, con un paciente nuevo', async () => {
  await control(page, 'Agendar').click()
  await buscarPaciente(h).fill('Ana Prueba')
  await control(h, 'Agregar «Ana Prueba» como paciente nuevo').click()
  await expect(h).toContainText('Paciente nuevo')
  await campo(h, 'Hora').fill('10:30')
  await campo(h, 'Lugar').selectOption({ label: 'Clínica' })
  await enviar()
  await expect(alerta(h)).toHaveText(
    'Ya tienes una cita de 10:00 a 11:30 en Consultorio (Lucía Fernández).',
  )
})

test('choque por sillón: otra profesional en el mismo consultorio', async () => {
  await campo(h, 'Profesional').selectOption({ label: 'Dra. Rocío Paz · Ortodoncia' })
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio' })
  await enviar()
  await expect(alerta(h)).toHaveText(
    'Consultorio ya está ocupado de 10:00 a 11:30 (Dra. Laura Méndez, Lucía Fernández).',
  )
})

test('corrigiendo el lugar, se guarda con el paciente nuevo', async () => {
  await campo(h, 'Lugar').selectOption({ label: 'Consultorio de Rocío' })
  await enviar()
  await expect(h).toBeHidden()
  await expect(delSabado()).toHaveCount(2)
  await expect(delSabado().filter({ hasText: 'Ana Prueba' })).toContainText('Dra. Rocío Paz')
})

test('un bloqueo desde el celular', async () => {
  await page.setViewportSize(CELULAR)
  await page.goto(`/?fecha=${SABADO}`)
  await control(page, 'Agendar').click()
  await h.getByRole('radio', { name: 'Bloqueo' }).click()
  await expect(h).toContainText('Nuevo bloqueo')
  await campo(h, 'Hora').fill('15:00')
  await campo(h, 'Duración').selectOption({ label: '2 h' })
  await campo(h, 'Motivo').fill('Viaje a la clínica')
  await control(h, 'Guardar bloqueo').click()
  await expect(h).toBeHidden()
  await expect(
    citasVisibles(page).filter({ hasText: 'Viaje a la clínica' }).filter({ hasText: 'Bloqueo' }),
  ).toHaveCount(1)
})

test('una cita en otra semana lleva a ese día', async () => {
  await control(page, 'Agendar').click()
  await buscarPaciente(h).fill('mateo')
  await control(h, 'Mateo Flores').click()
  await cambiarFecha(h, OTRO_SABADO)
  await enviar()
  await expect(page).toHaveURL(`/?fecha=${OTRO_SABADO}`)
  await expect(citasVisibles(page).filter({ hasText: 'Mateo Flores' })).toHaveCount(1)
})

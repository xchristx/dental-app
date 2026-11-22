// Ver la boca en una fecha (0021). En el seed, Camila tuvo una caries en 36
// hace 90 días (su primera consulta) que se obturó hace 7.
import { expect, test, type Page } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { hoy, sumarDias } from './apoyo/fechas'
import { ESCRITORIO, control, entrarComoDemo, principal } from './apoyo/pagina'

test.describe.configure({ mode: 'serial' })

const CAMILA = '50000000-0000-4000-8000-000000000001'

let page: Page

test.beforeAll(async ({ browser }) => {
  await reiniciarBase()
  page = await browser.newPage({ viewport: ESCRITORIO })
  await entrarComoDemo(page, `/pacientes/${CAMILA}/odontograma`)
})

test.afterAll(() => page.close())

const numerica = (f: string) => f.split('-').reverse().join('/')
const inicial = () => numerica(sumarDias(hoy(), -90))
const linea = () => page.getByRole('slider', { name: 'Ver la boca al' })
const pieza = (n: number) => page.getByRole('button', { name: new RegExp(`^Pieza ${n}[:,]`) })
const plan = () =>
  principal(page)
    .locator('section[aria-labelledby=titulo-plan]')
    .locator('li')
    .evaluateAll((li) => li.map((x) => (x as HTMLElement).innerText.replace(/\n+/g, ' ')))

test('hoy muestra lo tratado y el plan con lo pendiente', async () => {
  await expect(linea()).toHaveAttribute('aria-valuetext', /^Hoy/)
  await expect(pieza(36)).toHaveAccessibleName(`Pieza 36: Obt-OM (obturación), Rx del ${inicial()}`)
  await expect.poll(plan).toEqual(['25 C I-P Caries Tratar'])
})

test('en el odontograma inicial la caries de 36 estaba pendiente, solo para mirar', async () => {
  await linea().fill('0')
  await expect(linea()).toHaveAttribute('aria-valuetext', `${inicial()} (inicial)`)
  await expect(principal(page)).toContainText(`Así estaba el ${inicial()}.`)

  // La Rx de ese día ya estaba tomada (0023).
  await expect(pieza(36)).toHaveAccessibleName(`Pieza 36: C II-OM (caries), Rx del ${inicial()}`)
  await expect(pieza(36)).toBeDisabled()
  await expect(principal(page).locator('#titulo-plan')).toContainText(`Pendiente al ${inicial()}`)
  // Sin botones: no se trata algo en el pasado.
  await expect.poll(plan).toEqual(['25 C I-P Caries', '36 C II-OM Caries'])
  await expect(page.getByRole('button', { name: 'Pincel' })).toHaveCount(0)
})

test('"Volver a hoy" vuelve al odontograma actual', async () => {
  await control(page, 'Volver a hoy').click()
  await expect(linea()).toHaveAttribute('aria-valuetext', /^Hoy/)
  await expect(pieza(36)).toBeEnabled()
  await expect.poll(plan).toEqual(['25 C I-P Caries Tratar'])
})

test('cada día con registros tiene su fecha debajo, y se puede tocar', async () => {
  const corta = inicial().replace(/\d\d(\d\d)$/, '$1') // "03/03/26"
  await principal(page).getByText(corta, { exact: true }).click()
  await expect(linea()).toHaveAttribute('aria-valuetext', `${inicial()} (inicial)`)
  await expect(pieza(36)).toBeDisabled()
  await control(page, 'Volver a hoy').click()
})

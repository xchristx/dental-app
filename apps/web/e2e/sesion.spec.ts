import { expect, test } from '@playwright/test'
import { reiniciarBase } from './apoyo/base'
import { CELULAR, control, entrarComoDemo } from './apoyo/pagina'

test.beforeAll(reiniciarBase)

test('sin sesión, una ruta protegida pide entrar y después vuelve a ella', async ({ page }) => {
  await page.goto('/pacientes')
  await expect(page).toHaveURL('/entrar?siguiente=%2Fpacientes')
  await page.getByRole('button', { name: 'Entrar como demo' }).click()
  await expect(page).toHaveURL('/pacientes')
})

test('con sesión, /entrar lleva a la agenda y la barra lateral muestra la cuenta', async ({
  page,
}) => {
  await entrarComoDemo(page)
  await page.goto('/entrar')
  await expect(page).toHaveURL('/')
  const lateral = page.locator('aside')
  await expect(lateral).toContainText('demo@ejemplo.test')
  await expect(lateral).toContainText('Salir')
  await expect(page.getByText('Demo · datos inventados').first()).toBeVisible()
})

test('en el celular, "Salir" está en Ajustes y cierra la sesión', async ({ page }) => {
  await entrarComoDemo(page, '/ajustes')
  await expect(page).toHaveURL('/ajustes')
  await page.setViewportSize(CELULAR)
  await control(page, 'Salir').click()
  await expect(page).toHaveURL('/entrar')
  await page.goto('/')
  await expect(page).toHaveURL('/entrar')
})

test('?siguiente a otro dominio no saca de la app', async ({ page }) => {
  await page.goto('/entrar?siguiente=//ejemplo.com')
  await page.getByRole('button', { name: 'Entrar como demo' }).click()
  await expect(page).toHaveURL('/')
})

test('una contraseña incorrecta muestra el error en español', async ({ page }) => {
  await page.goto('/entrar')
  await page.locator('input[name=correo]').fill('demo@ejemplo.test')
  await page.locator('input[name=contrasena]').fill('incorrecta')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'no son correctos' })).toBeVisible()
})

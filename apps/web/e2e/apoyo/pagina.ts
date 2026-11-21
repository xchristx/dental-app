// Ayudas para recorrer la app como la usa la dentista: por textos y etiquetas
// visibles, no por clases de CSS.
import { expect, type Locator, type Page } from '@playwright/test'

export const ESCRITORIO = { width: 1440, height: 900 }
export const CELULAR = { width: 390, height: 844 }

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function entrarComoDemo(page: Page, siguiente = '/') {
  await page.goto(`/entrar?siguiente=${encodeURIComponent(siguiente)}`)
  await page.getByRole('button', { name: 'Entrar como demo' }).click()
  await page.waitForURL((url) => url.pathname !== '/entrar')
}

/** La hoja abierta de más arriba (al abrir otra, la anterior se cierra con una animación). */
export const hoja = (page: Page) =>
  page.locator('[data-slot=sheet-content]:not([data-state=closed])').last()

/** Botón o enlace visible por su nombre accesible exacto (texto o aria-label). */
export const control = (raiz: Page | Locator, nombre: string) =>
  raiz
    .getByRole('button', { name: nombre, exact: true })
    .or(raiz.getByRole('link', { name: nombre, exact: true }))
    .filter({ visible: true })
    .first()

/** Campo de un formulario por el texto con que empieza su etiqueta. */
export const campo = (raiz: Locator, etiqueta: string) =>
  raiz
    .locator('label')
    .filter({ hasText: new RegExp(`^\\s*${escapar(etiqueta)}`) })
    .locator('input, select, textarea')
    .first()

/**
 * Cambia la fecha en "Agendar" y espera los horarios libres de ese día. Antes
 * de que lleguen, la hora que se escriba puede quedar pisada por la sugerida.
 */
export async function cambiarFecha(h: Locator, fecha: string) {
  await campo(h, 'Fecha').fill(fecha)
  await expect(h.getByText('Buscando horarios libres…')).toHaveCount(0)
}

export const buscarPaciente = (raiz: Page | Locator) =>
  raiz.locator('input[aria-label="Buscar paciente"]').filter({ visible: true })

/** Texto de la opción elegida en un select, o el valor de un input. */
export const valor = (raiz: Locator, etiqueta: string) =>
  campo(raiz, etiqueta).evaluate((el) =>
    el instanceof HTMLSelectElement
      ? (el.selectedOptions[0]?.textContent ?? '')
      : (el as HTMLInputElement).value,
  )

/** Los pares "dato: valor" del detalle de una cita. */
export const datos = (h: Locator) =>
  h
    .locator('dl > div')
    .evaluateAll((filas) =>
      Object.fromEntries(
        filas.map((f) => [
          f.querySelector('dt')?.textContent ?? '',
          f.querySelector('dd')?.textContent ?? '',
        ]),
      ),
    ) as Promise<Record<string, string>>

/** Textos de los botones y enlaces visibles. */
export const botones = async (raiz: Locator) =>
  (await raiz.locator('button, a').filter({ visible: true }).allInnerTexts())
    .map((t) => t.trim())
    .filter(Boolean)

export const titulo = (h: Locator) => h.locator('[data-slot=sheet-title]')
export const descripcion = (h: Locator) => h.locator('[data-slot=sheet-description]')
export const alerta = (h: Locator) => h.locator('[role=alert]')

/** El contenido de la página. Next 16 deja la página anterior oculta en el DOM (<Activity>). */
export const principal = (page: Page) => page.locator('main').filter({ visible: true })

/** Título de la agenda: el día en el celular, la semana desde tablet. */
export const tituloAgenda = (page: Page) =>
  page.locator('h1 button > span').filter({ visible: true })

/** El campo de fecha oculto que abre el calendario del título. */
export const calendarioAgenda = (page: Page) => page.locator('h1 input[type=date]')

/** Abre el detalle de la cita que muestra ese texto en la agenda o en la ficha. */
export async function abrirCita(page: Page, texto: string) {
  await page.getByRole('link').filter({ hasText: texto }).filter({ visible: true }).first().click()
  await expect(hoja(page)).toBeVisible()
}

/** Citas visibles; con `dia` ("Martes 17 de noviembre"), solo esa columna de la semana. */
// Por selector y no por rol: con una hoja abierta, Radix oculta el resto a los lectores de pantalla.
export const citasVisibles = (page: Page, dia?: string) =>
  (dia ? page.locator(`section[aria-label="${dia}"]`) : page)
    .locator('article')
    .filter({ visible: true })

export const cerrarHoja = (page: Page) => page.keyboard.press('Escape')

/** Pedidos al servidor (documentos, fetch y XHR) desde que se llama. */
export function contarPedidos(page: Page) {
  const pedidos: string[] = []
  page.on('request', (r) => {
    if (['document', 'fetch', 'xhr'].includes(r.resourceType())) pedidos.push(r.url())
  })
  return pedidos
}

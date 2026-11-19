// Variables públicas de Supabase. Next las reemplaza al compilar, por eso
// se leen con el nombre completo y no con process.env[nombre].
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const clavePublica = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function configSupabase() {
  if (!url || !clavePublica) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Ver apps/web/.env.example.',
    )
  }
  return { url, clavePublica }
}

/** La demo muestra datos inventados y permite entrar sin cuenta. */
export const ES_DEMO = process.env.NEXT_PUBLIC_ES_DEMO === 'true'

/** El botón de Google se muestra solo cuando el proveedor está configurado en Supabase. */
export const GOOGLE_HABILITADO = process.env.NEXT_PUBLIC_GOOGLE_HABILITADO === 'true'

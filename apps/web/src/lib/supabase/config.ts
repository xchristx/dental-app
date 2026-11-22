// Variables públicas: Vite las incrusta al compilar. Ninguna es secreta.
// Ver apps/web/.env.example.
const url = import.meta.env.VITE_SUPABASE_URL
const clavePublica = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export function configSupabase() {
  if (!url || !clavePublica) {
    throw new Error(
      'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Ver apps/web/.env.example.',
    )
  }
  return { url, clavePublica }
}

/** La demo muestra datos inventados y permite entrar sin cuenta. */
export const ES_DEMO = import.meta.env.VITE_ES_DEMO === 'true'

/**
 * La cuenta del botón "Entrar como demo". Es pública a propósito (está en
 * supabase/seed.sql) y solo existe en la demo. En producción va vacía.
 */
export const CUENTA_DEMO = {
  correo: import.meta.env.VITE_DEMO_EMAIL ?? '',
  contrasena: import.meta.env.VITE_DEMO_PASSWORD ?? '',
}

/** El botón de Google se muestra solo cuando el proveedor está configurado en Supabase. */
export const GOOGLE_HABILITADO = import.meta.env.VITE_GOOGLE_HABILITADO === 'true'

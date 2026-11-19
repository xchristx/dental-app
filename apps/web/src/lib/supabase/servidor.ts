import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { configSupabase } from './config'

/**
 * Cliente de Supabase para componentes de servidor, server actions y route
 * handlers. Se crea uno por request: nunca se comparte entre requests.
 */
export async function crearClienteServidor() {
  const { url, clavePublica } = configSupabase()
  const cookieStore = await cookies()

  return createServerClient(url, clavePublica, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaGuardar) {
        try {
          for (const { name, value, options } of cookiesParaGuardar) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Desde un componente de servidor no se pueden escribir cookies.
          // No importa: el proxy ya renueva la sesión en cada request.
        }
      },
    },
  })
}

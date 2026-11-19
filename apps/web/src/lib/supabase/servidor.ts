import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { configSupabase } from './config'
import type { Database } from './tipos-db'

/**
 * Cliente de Supabase para componentes de servidor, server actions y route
 * handlers. Se crea uno por request: nunca se comparte entre requests.
 */
export async function crearClienteServidor() {
  // Primero cookies(): con Cache Components marca que esto corre en cada
  // request, y así el build no necesita las variables de Supabase.
  const cookieStore = await cookies()
  // Con partialPrefetching, el App Shell se arma con las cookies ya leídas,
  // pero `auth.getClaims()` usa Date.now() para ver si el token venció, y
  // Next no lo permite ahí. Los datos son de cada usuario (RLS): se espera
  // un request real.
  await connection()
  const { url, clavePublica } = configSupabase()

  return createServerClient<Database>(url, clavePublica, {
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

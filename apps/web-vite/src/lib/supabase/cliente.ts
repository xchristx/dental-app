import { createClient } from '@supabase/supabase-js'
import { configSupabase } from './config'
import type { Database } from './tipos-db'

const { url, clavePublica } = configSupabase()

/**
 * El único cliente de Supabase de la app: el navegador habla directo con la
 * base (0017). supabase-js guarda la sesión y la renueva antes de que venza.
 * RLS decide qué datos puede ver y cambiar cada usuaria.
 */
export const supabase = createClient<Database>(url, clavePublica, {
  auth: {
    // Para volver de Google con un código que se cambia por la sesión.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

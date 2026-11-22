import { queryClient } from '@/lib/consultas'
import { CUENTA_DEMO, ES_DEMO } from '@/lib/supabase/config'
import { supabase } from '@/lib/supabase/cliente'

export type ResultadoEntrar = { ok: true } | { ok: false; error: string }

const ERROR_CONEXION = 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'

// Queda en la consola del navegador. Nunca se registran el correo ni la contraseña.
function registrarError(
  accion: string,
  error: { code?: string; status?: number; message: string },
) {
  console.error(
    `[${accion}] código=${error.code ?? '-'} estado=${error.status ?? '-'}: ${error.message}`,
  )
}

export async function entrarConCorreo(
  correo: string,
  contrasena: string,
): Promise<ResultadoEntrar> {
  if (!correo.trim() || !contrasena) {
    return { ok: false, error: 'Escribe tu correo y tu contraseña.' }
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  })
  if (error) {
    if (error.code !== 'invalid_credentials') registrarError('entrar', error)
    return {
      ok: false,
      error:
        error.code === 'invalid_credentials'
          ? 'El correo o la contraseña no son correctos.'
          : ERROR_CONEXION,
    }
  }
  return { ok: true }
}

export async function entrarComoDemo(): Promise<ResultadoEntrar> {
  if (!ES_DEMO || !CUENTA_DEMO.correo || !CUENTA_DEMO.contrasena) {
    return { ok: false, error: 'La entrada de demostración no está disponible.' }
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: CUENTA_DEMO.correo,
    password: CUENTA_DEMO.contrasena,
  })
  if (error) {
    registrarError('entrar-demo', error)
    return { ok: false, error: ERROR_CONEXION }
  }
  return { ok: true }
}

/** Lleva a Google; al volver, /auth/callback termina de entrar y va a `siguiente`. */
export async function entrarConGoogle(siguiente: string): Promise<ResultadoEntrar> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`,
    },
  })
  if (error) {
    registrarError('entrar-google', error)
    return { ok: false, error: 'No pudimos entrar con Google. Inténtalo de nuevo.' }
  }
  return { ok: true }
}

/** Cierra la sesión y borra de la caché los datos de esta usuaria. */
export async function salir() {
  await supabase.auth.signOut()
  queryClient.clear()
}

/** La sesión guardada en este navegador, o null. No va a la red. */
export async function sesionActual() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

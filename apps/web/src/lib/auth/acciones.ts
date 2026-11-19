'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { rutaInternaSegura } from '@dental/core'
import { ES_DEMO } from '@/lib/supabase/config'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export interface EstadoEntrar {
  error: string | null
}

const ERROR_CONEXION = 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'

export async function entrarConCorreo(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const correo = String(formData.get('correo') ?? '').trim()
  const contrasena = String(formData.get('contrasena') ?? '')
  if (!correo || !contrasena) {
    return { error: 'Escribe tu correo y tu contraseña.' }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
  if (error) {
    return {
      error:
        error.code === 'invalid_credentials'
          ? 'El correo o la contraseña no son correctos.'
          : ERROR_CONEXION,
    }
  }

  redirect(rutaInternaSegura(formData.get('siguiente')))
}

export async function entrarComoDemo(
  _anterior: EstadoEntrar,
  formData: FormData,
): Promise<EstadoEntrar> {
  const correo = process.env.DEMO_EMAIL
  const contrasena = process.env.DEMO_PASSWORD
  if (!ES_DEMO || !correo || !contrasena) {
    return { error: 'La entrada de demostración no está disponible.' }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena })
  if (error) return { error: ERROR_CONEXION }

  redirect(rutaInternaSegura(formData.get('siguiente')))
}

export async function entrarConGoogle(formData: FormData) {
  const origen = (await headers()).get('origin')
  const siguiente = rutaInternaSegura(formData.get('siguiente'))

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origen}/auth/callback?siguiente=${encodeURIComponent(siguiente)}`,
    },
  })

  if (error || !data.url) redirect('/entrar?error=google')
  redirect(data.url)
}

export async function salir() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect('/entrar')
}

import { NextResponse, type NextRequest } from 'next/server'
import { rutaInternaSegura } from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'

// Vuelta desde Google: Supabase manda un código que se cambia por la sesión.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const codigo = searchParams.get('code')
  const siguiente = rutaInternaSegura(searchParams.get('siguiente'))

  if (codigo) {
    const supabase = await crearClienteServidor()
    const { error } = await supabase.auth.exchangeCodeForSession(codigo)
    if (!error) return NextResponse.redirect(new URL(siguiente, origin))
  }

  // Sin registro público (0007): una cuenta de Google sin invitación no puede entrar.
  const descripcion = searchParams.get('error_description') ?? ''
  const motivo = /signups? not allowed/i.test(descripcion) ? 'sin-acceso' : 'google'
  return NextResponse.redirect(new URL(`/entrar?error=${motivo}`, origin))
}

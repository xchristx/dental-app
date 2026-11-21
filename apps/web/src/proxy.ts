import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { configSupabase } from '@/lib/supabase/config'

// Rutas que se pueden ver sin sesión.
const RUTAS_PUBLICAS = ['/entrar', '/auth/callback']

function esPublica(pathname: string) {
  return RUTAS_PUBLICAS.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))
}

/**
 * Renueva la sesión de Supabase en cada request y redirige según haya sesión
 * o no. Es un control optimista: los datos igual los protege RLS en Postgres.
 */
export async function proxy(request: NextRequest) {
  const { url, clavePublica } = configSupabase()
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(url, clavePublica, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaGuardar, encabezados) {
        for (const { name, value } of cookiesParaGuardar) {
          request.cookies.set(name, value)
        }
        respuesta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesParaGuardar) {
          respuesta.cookies.set(name, value, options)
        }
        // Evita que una CDN guarde una respuesta con la sesión de otra persona.
        for (const [clave, valor] of Object.entries(encabezados)) {
          respuesta.headers.set(clave, valor)
        }
      },
    },
  })

  // No poner código entre createServerClient y getClaims: getClaims es lo que
  // renueva el token cuando venció.
  const { data } = await supabase.auth.getClaims()
  const haySesion = Boolean(data?.claims)
  const { pathname, search } = request.nextUrl

  if (!haySesion && !esPublica(pathname)) {
    const destino = new URL('/entrar', request.url)
    if (pathname !== '/') destino.searchParams.set('siguiente', pathname + search)
    return redirigirConCookies(destino, respuesta)
  }

  if (haySesion && pathname === '/entrar') {
    return redirigirConCookies(new URL('/', request.url), respuesta)
  }

  return respuesta
}

// Una redirección tiene que llevar las cookies renovadas; si no, se pierde la sesión.
function redirigirConCookies(destino: URL, respuesta: NextResponse) {
  const redireccion = NextResponse.redirect(destino)
  for (const cookie of respuesta.cookies.getAll()) {
    redireccion.cookies.set(cookie)
  }
  return redireccion
}

export const config = {
  matcher: [
    // Todo menos los archivos estáticos y el manifiesto (el navegador lo pide sin la sesión).
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

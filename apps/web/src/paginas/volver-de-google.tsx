import { useEffect } from 'react'
import { rutaInternaSegura } from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'
import { useIr, useParametro } from '@/lib/navegacion'

/**
 * Vuelta desde Google: supabase-js cambia el código de la URL por la sesión
 * (detectSessionInUrl). Sin registro público (0007), una cuenta de Google sin
 * invitación vuelve con un error.
 */
export function PaginaVolverDeGoogle() {
  const ir = useIr()
  const siguiente = rutaInternaSegura(useParametro('siguiente'))
  const descripcion = useParametro('error_description')

  useEffect(() => {
    if (descripcion) {
      const motivo = /signups? not allowed/i.test(descripcion) ? 'sin-acceso' : 'google'
      void ir(`/entrar?error=${motivo}`, { reemplazar: true })
      return
    }
    void supabase.auth.getSession().then(({ data }) => {
      void ir(data.session ? siguiente : '/entrar?error=google', { reemplazar: true })
    })
  }, [descripcion, ir, siguiente])

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-muted-foreground">Entrando…</p>
    </main>
  )
}

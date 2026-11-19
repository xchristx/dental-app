import { SignOutIcon } from '@phosphor-icons/react/ssr'
import { Button } from '@/components/ui/button'
import { salir } from '@/lib/auth/acciones'
import { crearClienteServidor } from '@/lib/supabase/servidor'

/** Correo de la sesión y botón "Salir". Lee cookies: usar dentro de Suspense. */
export async function SesionUsuario() {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.auth.getClaims()
  const correo = typeof data?.claims.email === 'string' ? data.claims.email : null

  return (
    <div className="flex flex-col gap-2">
      {correo && <p className="text-muted-foreground truncate text-sm lg:px-3">{correo}</p>}
      <form action={salir}>
        <Button variant="outline" size="sm" className="w-full">
          <SignOutIcon weight="bold" />
          Salir
        </Button>
      </form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { SignOutIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { salir, sesionActual } from '@/lib/auth/acciones'
import { useIr } from '@/lib/navegacion'

/** Correo de la sesión y botón "Salir". */
export function SesionUsuario() {
  const ir = useIr()
  const [correo, setCorreo] = useState<string | null>(null)
  const [saliendo, setSaliendo] = useState(false)

  useEffect(() => {
    let vigente = true
    void sesionActual().then((s) => vigente && setCorreo(s?.user.email ?? null))
    return () => {
      vigente = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-2">
      {correo && <p className="text-muted-foreground truncate text-sm lg:px-3">{correo}</p>}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={saliendo}
        onClick={async () => {
          setSaliendo(true)
          await salir()
          void ir('/entrar', { reemplazar: true })
        }}
      >
        <SignOutIcon weight="bold" />
        Salir
      </Button>
    </div>
  )
}

'use client'

import { use, useActionState } from 'react'
import { GoogleLogoIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  entrarComoDemo,
  entrarConCorreo,
  entrarConGoogle,
  type EstadoEntrar,
} from '@/lib/auth/acciones'

const ERRORES_DE_URL: Record<string, string> = {
  google: 'No pudimos entrar con Google. Inténtalo de nuevo.',
  'sin-acceso':
    'Esa cuenta de Google todavía no tiene acceso. Pídele una invitación a quien administra la agenda.',
}

const sinError: EstadoEntrar = { error: null }

const claseInput =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

function primerValor(valor: string | string[] | undefined) {
  return Array.isArray(valor) ? valor[0] : valor
}

export function FormularioEntrar({
  parametros,
  esDemo,
  googleHabilitado,
}: {
  parametros: Promise<Record<string, string | string[] | undefined>>
  esDemo: boolean
  googleHabilitado: boolean
}) {
  const { siguiente, error } = use(parametros)
  const destino = primerValor(siguiente) ?? '/'
  const errorDeUrl = ERRORES_DE_URL[primerValor(error) ?? '']

  const [estadoCorreo, accionCorreo, entrandoConCorreo] = useActionState(entrarConCorreo, sinError)
  const [estadoDemo, accionDemo, entrandoComoDemo] = useActionState(entrarComoDemo, sinError)
  const mensajeError = estadoCorreo.error ?? estadoDemo.error ?? errorDeUrl

  return (
    <div className="flex flex-col gap-6">
      {mensajeError && (
        <p role="alert" className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm">
          {mensajeError}
        </p>
      )}

      {esDemo && (
        <form action={accionDemo} className="flex flex-col gap-2">
          <input type="hidden" name="siguiente" value={destino} />
          <Button size="lg" disabled={entrandoComoDemo}>
            {entrandoComoDemo ? 'Entrando…' : 'Entrar como demo'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Sin cuenta. Puedes probar todo: los datos se reinician.
          </p>
        </form>
      )}

      {googleHabilitado && (
        <form action={entrarConGoogle}>
          <input type="hidden" name="siguiente" value={destino} />
          <Button variant="outline" className="w-full">
            <GoogleLogoIcon weight="bold" />
            Entrar con Google
          </Button>
        </form>
      )}

      {(esDemo || googleHabilitado) && (
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span className="bg-border h-px flex-1" />o con tu correo
          <span className="bg-border h-px flex-1" />
        </div>
      )}

      <form action={accionCorreo} className="flex flex-col gap-4">
        <input type="hidden" name="siguiente" value={destino} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Correo
          <input name="correo" type="email" autoComplete="email" required className={claseInput} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Contraseña
          <input
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            className={claseInput}
          />
        </label>
        <Button variant={esDemo ? 'outline' : 'default'} disabled={entrandoConCorreo}>
          {entrandoConCorreo ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        No hay registro abierto. Para tener acceso, pide una invitación a quien administra la
        agenda.
      </p>
    </div>
  )
}

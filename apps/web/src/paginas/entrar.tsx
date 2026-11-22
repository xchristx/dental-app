import { useEffect, useState } from 'react'
import { GoogleLogoIcon, ToothIcon } from '@phosphor-icons/react'
import { rutaInternaSegura } from '@dental/core'
import { Button } from '@/components/ui/button'
import { entrarComoDemo, entrarConCorreo, entrarConGoogle } from '@/lib/auth/acciones'
import { tituloDePagina, useIr, useParametro } from '@/lib/navegacion'
import { ES_DEMO, GOOGLE_HABILITADO } from '@/lib/supabase/config'

const ERRORES_DE_URL: Record<string, string> = {
  google: 'No pudimos entrar con Google. Inténtalo de nuevo.',
  'sin-acceso':
    'Esa cuenta de Google todavía no tiene acceso. Pídele una invitación a quien administra la agenda.',
}

const claseInput =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

export function PaginaEntrar() {
  useEffect(() => tituloDePagina('Entrar'), [])
  const ir = useIr()
  // ?siguiente nunca saca de la app (por ejemplo, ?siguiente=//otro-sitio.com).
  const destino = rutaInternaSegura(useParametro('siguiente'))
  const errorDeUrl = ERRORES_DE_URL[useParametro('error') ?? '']

  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState<'demo' | 'correo' | 'google' | null>(null)
  const mensajeError = error ?? errorDeUrl

  async function entrar(
    como: 'demo' | 'correo' | 'google',
    accion: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setEntrando(como)
    setError(null)
    const resultado = await accion()
    if (!resultado.ok) {
      setError(resultado.error)
      setEntrando(null)
      return
    }
    // Con Google, el navegador ya se fue a la página de Google.
    if (como !== 'google') void ir(destino, { reemplazar: true })
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <ToothIcon weight="bold" className="size-8" />
        <div>
          <h1 className="font-heading text-3xl leading-[1.1] tracking-[-0.02em]">Sifel</h1>
          <p className="text-muted-foreground">Agenda dental</p>
        </div>
        {ES_DEMO && (
          <p className="bg-warning-bg text-warning rounded-full px-3 py-1 text-sm font-medium">
            Demo · datos inventados
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        {mensajeError && (
          <p
            role="alert"
            className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
          >
            {mensajeError}
          </p>
        )}

        {ES_DEMO && (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              disabled={entrando !== null}
              onClick={() => entrar('demo', entrarComoDemo)}
            >
              {entrando === 'demo' ? 'Entrando…' : 'Entrar como demo'}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Sin cuenta. Puedes probar todo: los datos se reinician.
            </p>
          </div>
        )}

        {GOOGLE_HABILITADO && (
          <Button
            variant="outline"
            disabled={entrando !== null}
            onClick={() => entrar('google', () => entrarConGoogle(destino))}
          >
            <GoogleLogoIcon weight="bold" />
            Entrar con Google
          </Button>
        )}

        {(ES_DEMO || GOOGLE_HABILITADO) && (
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <span className="bg-border h-px flex-1" />o con tu correo
            <span className="bg-border h-px flex-1" />
          </div>
        )}

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            const datos = new FormData(e.currentTarget)
            void entrar('correo', () =>
              entrarConCorreo(
                String(datos.get('correo') ?? ''),
                String(datos.get('contrasena') ?? ''),
              ),
            )
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Correo
            <input
              name="correo"
              type="email"
              autoComplete="email"
              required
              className={claseInput}
            />
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
          <Button variant={ES_DEMO ? 'outline' : 'default'} disabled={entrando !== null}>
            {entrando === 'correo' ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          No hay registro abierto. Para tener acceso, pide una invitación a quien administra la
          agenda.
        </p>
      </div>
    </main>
  )
}

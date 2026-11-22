import { useState, useTransition } from 'react'
import { DownloadSimpleIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import { filasDelRecibo, numeroDeRecibo, type DatosRecibo } from '@dental/core'
import { Button } from '@/components/ui/button'
import { SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { descargarRecibo, enlaceRecibo, enviarRecibo } from '@/lib/pagos/recibo'

/**
 * El recibo de un pago, listo para mandar por WhatsApp (0028). Va dentro de
 * una hoja; se abre al guardar un pago o desde la planilla.
 */
export function HojaRecibo({ recibo, telefono }: { recibo: DatosRecibo; telefono: string | null }) {
  const [estado, setEstado] = useState<'compartido' | 'descargado' | 'cancelado' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  const accion = (hacer: () => Promise<void>) =>
    iniciar(async () => {
      setError(null)
      try {
        await hacer()
      } catch (e) {
        console.error('[recibo]', e)
        setError('No pudimos armar el recibo. Inténtalo de nuevo.')
      }
    })

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader>
        <SheetTitle>Recibo {numeroDeRecibo(recibo.numero)}</SheetTitle>
        <SheetDescription>
          Mándaselo por WhatsApp: reemplaza la firma de la planilla.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-4 px-4 py-3 md:px-6">
        <article
          aria-label="Vista previa del recibo"
          className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4"
        >
          <div>
            <p className="font-medium">{recibo.consultorio}</p>
            <p className="text-muted-foreground font-mono text-sm">
              Recibo {numeroDeRecibo(recibo.numero)}
            </p>
          </div>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            {filasDelRecibo(recibo).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="contents">
                <dt className="text-muted-foreground">{etiqueta}</dt>
                <dd className="font-medium tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground text-xs">Este recibo no es una factura.</p>
        </article>

        <div role="status" className="text-sm empty:hidden">
          {estado === 'compartido' && 'Listo: el recibo se compartió.'}
          {estado === 'descargado' && (
            <span className="flex flex-col gap-2">
              Se descargó el PDF. En el chat de WhatsApp, adjúntalo con el clip.
              <a
                href={enlaceRecibo(recibo, telefono)}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:bg-muted flex min-h-11 items-center gap-2 self-start rounded-sm border px-3 font-medium"
              >
                <WhatsappLogoIcon weight="bold" className="size-4" />
                Abrir WhatsApp
              </a>
            </span>
          )}
        </div>
      </div>

      <SheetFooter className="border-border bg-popover sticky bottom-0 border-t">
        {error && (
          <p
            role="alert"
            className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}
        <Button
          size="lg"
          disabled={pendiente}
          onClick={() => accion(async () => setEstado(await enviarRecibo(recibo, telefono)))}
        >
          <WhatsappLogoIcon weight="bold" />
          {pendiente ? 'Armando el recibo…' : 'Enviar por WhatsApp'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={pendiente}
          onClick={() => accion(() => descargarRecibo(recibo))}
        >
          <DownloadSimpleIcon weight="bold" />
          Descargar PDF
        </Button>
      </SheetFooter>
    </div>
  )
}

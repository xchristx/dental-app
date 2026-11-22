import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FilePdfIcon, PaperclipIcon, ProhibitIcon } from '@phosphor-icons/react'
import { formatearFechaNumerica } from '@dental/core'
import { Button } from '@/components/ui/button'
import { anularArchivo, subirArchivo } from '@/lib/archivos/acciones'
import { consultaArchivos, type Archivo } from '@/lib/archivos/datos'
import { cn } from '@/lib/utils'

type Ligado =
  | { tipo: 'radiografia'; rxId: string; movimientoId?: never }
  | { tipo: 'comprobante'; movimientoId: string; rxId?: never }

/**
 * La imagen de una Rx o el comprobante de un pago (0029): las miniaturas de lo
 * ya adjuntado y un botón para adjuntar. Se sube con la fecha de la Rx o del
 * pago, sin formulario: elegir el archivo alcanza.
 */
export function ArchivosLigados({
  pacienteId,
  fecha,
  nombre,
  ...ligado
}: Ligado & {
  pacienteId: string
  /** La fecha de la Rx o del pago. */
  fecha: string
  /** "de la Rx del 03/03/2026" o "del recibo N.º 0006": completa los textos de los botones. */
  nombre: string
}) {
  const archivos = useQuery(consultaArchivos(pacienteId))
  const [estado, setEstado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()
  const datos = archivos.data
  if (!datos) return null

  const esComprobante = ligado.tipo === 'comprobante'
  const propios = datos.archivos.filter((a) =>
    esComprobante ? a.movimientoId === ligado.movimientoId : a.rxId === ligado.rxId,
  )
  const textoAdjuntar = esComprobante ? 'Adjuntar comprobante' : 'Adjuntar imagen'

  function adjuntar(archivo: File | undefined) {
    if (!archivo || !datos) return
    setError(null)
    setEstado('Subiendo…')
    iniciar(async () => {
      const r = await subirArchivo(
        archivo,
        {
          id: crypto.randomUUID(),
          pacienteId,
          tipo: ligado.tipo,
          nota: null,
          fecha,
          rxId: ligado.rxId ?? null,
          movimientoId: ligado.movimientoId ?? null,
        },
        datos.organizacionId,
      )
      if (r.ok)
        setEstado(
          esComprobante ? 'Listo: se adjuntó el comprobante.' : 'Listo: se adjuntó la imagen.',
        )
      else {
        setEstado(null)
        setError(r.error)
      }
    })
  }

  function anular(a: Archivo) {
    setError(null)
    iniciar(async () => {
      const r = await anularArchivo(a.id)
      if (r.ok) {
        setAnulando(null)
        setEstado(null)
      } else setError(r.error)
    })
  }

  if (!datos.permiteArchivos && propios.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        En la demo no se adjuntan {esComprobante ? 'comprobantes' : 'imágenes'}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {propios.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {propios.map((a, i) => {
            const etiqueta = `${esComprobante ? 'el comprobante' : 'la imagen'}${propios.length > 1 ? ` ${i + 1}` : ''} ${nombre}`
            return (
              <li key={a.id} className="flex items-center gap-3">
                <a
                  href={a.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${etiqueta}`}
                  className="border-border bg-muted focus-visible:ring-ring/40 block size-20 shrink-0 overflow-hidden rounded-lg border outline-none focus-visible:ring-3"
                >
                  {a.mime === 'application/pdf' || !a.url ? (
                    <span className="flex size-full items-center justify-center">
                      <FilePdfIcon weight="bold" className="text-muted-foreground size-7" />
                    </span>
                  ) : (
                    <img
                      src={a.url}
                      alt=""
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  )}
                </a>
                {anulando === a.id ? (
                  <span className="flex flex-wrap items-center gap-1 text-sm">
                    <span className="text-destructive w-full">
                      ¿Anularlo? Solo si fue un error.
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pendiente}
                      aria-label={`Sí, anular ${etiqueta}`}
                      onClick={() => anular(a)}
                    >
                      Sí
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pendiente}
                      onClick={() => setAnulando(null)}
                    >
                      No
                    </Button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Anular ${etiqueta}`}
                    onClick={() => setAnulando(a.id)}
                  >
                    <ProhibitIcon weight="bold" />
                    Anular {esComprobante ? 'comprobante' : 'imagen'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {datos.permiteArchivos && (
        // El input queda oculto con sr-only (no display: none): sigue en el árbol
        // de accesibilidad y el foco se ve en la etiqueta.
        <label
          className={cn(
            'border-input bg-card hover:bg-muted has-[:focus-visible]:ring-ring/40 flex min-h-11 cursor-pointer items-center gap-2 self-start rounded-sm border px-3 text-sm font-medium has-[:focus-visible]:ring-3',
            pendiente && 'pointer-events-none opacity-50',
          )}
        >
          <PaperclipIcon weight="bold" className="size-4" aria-hidden="true" />
          {textoAdjuntar}
          <span className="sr-only"> {nombre}</span>
          <input
            type="file"
            accept={esComprobante ? 'image/*,application/pdf' : 'image/*'}
            disabled={pendiente}
            className="sr-only"
            onChange={(e) => {
              adjuntar(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </label>
      )}

      <p role="status" className="text-sm empty:hidden">
        {estado}
      </p>
      {error && (
        <p role="alert" className="bg-destructive-bg text-destructive rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      )}
    </div>
  )
}

/** "de la Rx del 03/03/2026". */
export const nombreDeRx = (fecha: string) => `de la Rx del ${formatearFechaNumerica(fecha)}`

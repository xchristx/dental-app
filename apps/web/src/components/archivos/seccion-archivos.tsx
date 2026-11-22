import { useEffect, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowSquareOutIcon, FilePdfIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import {
  NOMBRE_TIPO_ARCHIVO,
  fechaEnZona,
  formatearFechaNumerica,
  formatearTamano,
} from '@dental/core'
import { claseCampo } from '@/components/historia/campos'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ZONA } from '@/lib/agenda/zona'
import { anularArchivo, subirArchivo } from '@/lib/archivos/acciones'
import { consultaArchivos, type Archivo } from '@/lib/archivos/datos'

const TIPOS = [
  { valor: 'radiografia', texto: 'Radiografía' },
  { valor: 'foto', texto: 'Foto' },
] as const

/** "Radiografía del 03/03/2026", o "Radiografía de la pieza 36 del 03/03/2026" si es de una Rx. */
const titulo = (a: Archivo) =>
  `${NOMBRE_TIPO_ARCHIVO[a.tipo]}${a.pieza ? ` de la pieza ${a.pieza}` : ''} del ${formatearFechaNumerica(a.fecha)}`

/**
 * Radiografías y fotos del paciente (0027), ordenadas por fecha. Incluye las
 * imágenes de cada Rx; los comprobantes se ven en el recibo de su pago (0029).
 */
export function SeccionArchivos({ pacienteId }: { pacienteId: string }) {
  const archivos = useQuery(consultaArchivos(pacienteId))
  const [subiendo, setSubiendo] = useState(false)
  const [viendo, setViendo] = useState<Archivo | null>(null)
  const datos = archivos.data && {
    ...archivos.data,
    archivos: archivos.data.archivos.filter((a) => a.tipo !== 'comprobante'),
  }

  return (
    <section aria-labelledby="titulo-archivos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-archivos" className="text-lg font-medium">
          Radiografías y fotos
        </h2>
        {datos?.permiteArchivos && (
          <Button variant="outline" onClick={() => setSubiendo(true)}>
            <UploadSimpleIcon weight="bold" />
            Subir
          </Button>
        )}
      </div>

      {!datos ? (
        <div
          aria-busy="true"
          aria-label="Cargando los archivos"
          className="bg-muted h-24 rounded-lg"
        />
      ) : (
        <>
          {!datos.permiteArchivos && (
            <p className="bg-muted rounded-lg px-3 py-2 text-sm">
              En la demo no se suben archivos: es pública y nadie debería subir fotos de pacientes
              reales.
            </p>
          )}
          {datos.archivos.length === 0 ? (
            datos.permiteArchivos && (
              <p className="text-muted-foreground text-sm">
                Sin archivos. Sube las radiografías y fotos, también las que te mandan por WhatsApp.
              </p>
            )
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {datos.archivos.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setViendo(a)}
                    aria-label={`${titulo(a)}${a.nota ? `: ${a.nota}` : ''}`}
                    className="border-border bg-card hover:bg-muted focus-visible:ring-ring/40 flex w-full flex-col overflow-hidden rounded-lg border text-left outline-none focus-visible:ring-3"
                  >
                    {a.mime === 'application/pdf' || !a.url ? (
                      <span className="bg-muted flex aspect-square w-full items-center justify-center">
                        <FilePdfIcon weight="bold" className="text-muted-foreground size-8" />
                      </span>
                    ) : (
                      <img
                        src={a.url}
                        alt=""
                        width={200}
                        height={200}
                        loading="lazy"
                        decoding="async"
                        className="bg-muted aspect-square w-full object-cover"
                      />
                    )}
                    <span className="px-2 py-1.5 text-xs">
                      <span className="block font-medium">
                        {a.pieza ? `Rx · pieza ${a.pieza}` : NOMBRE_TIPO_ARCHIVO[a.tipo]}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {formatearFechaNumerica(a.fecha)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Sheet open={subiendo} onOpenChange={setSubiendo}>
            <SheetContent>
              {subiendo && (
                <FormSubir
                  pacienteId={pacienteId}
                  organizacionId={datos.organizacionId}
                  onListo={() => setSubiendo(false)}
                />
              )}
            </SheetContent>
          </Sheet>
          <Sheet open={viendo !== null} onOpenChange={(a) => !a && setViendo(null)}>
            <SheetContent>
              {viendo && <Visor archivo={viendo} onAnulado={() => setViendo(null)} />}
            </SheetContent>
          </Sheet>
        </>
      )}
    </section>
  )
}

function FormSubir({
  pacienteId,
  organizacionId,
  onListo,
}: {
  pacienteId: string
  organizacionId: string
  onListo: () => void
}) {
  const [id] = useState(() => crypto.randomUUID())
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'radiografia' | 'foto'>('radiografia')
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(() => fechaEnZona(new Date(), ZONA))
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  // La vista previa se libera al cambiar de archivo o al cerrar.
  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista])

  function elegir(elegido: File | null) {
    setError(null)
    setArchivo(elegido)
    setVista(elegido?.type.startsWith('image/') ? URL.createObjectURL(elegido) : null)
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!archivo) {
      setError('Elige la foto o el PDF.')
      return
    }
    iniciar(async () => {
      const r = await subirArchivo(archivo, { id, pacienteId, tipo, nota, fecha }, organizacionId)
      if (r.ok) onListo()
      else setError(r.error)
    })
  }

  return (
    <form onSubmit={enviar} className="flex min-h-full flex-col" noValidate>
      <SheetHeader>
        <SheetTitle>Subir radiografía o foto</SheetTitle>
        <SheetDescription>
          Las fotos se achican antes de subirlas, para que suban rápido y ocupen poco.
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Archivo
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => elegir(e.target.files?.[0] ?? null)}
            className="file:border-input file:bg-card text-sm file:mr-3 file:h-11 file:rounded-sm file:border file:px-3 file:font-medium"
          />
        </label>
        {vista && (
          <img
            src={vista}
            alt="Vista previa del archivo elegido"
            className="bg-muted max-h-56 w-full rounded-lg object-contain"
          />
        )}
        {archivo && !vista && (
          <p className="text-muted-foreground text-sm">
            {archivo.name} · {formatearTamano(archivo.size)}
          </p>
        )}

        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1.5 text-sm font-medium">Es una</legend>
          <div className="flex flex-wrap gap-x-5">
            {TIPOS.map((t) => (
              <label key={t.valor} className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tipo"
                  checked={tipo === t.valor}
                  onChange={() => setTipo(t.valor)}
                  className="accent-primary size-5 shrink-0"
                />
                {t.texto}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Fecha
          <input
            type="date"
            max={fechaEnZona(new Date(), ZONA)}
            value={fecha}
            onChange={(e) => {
              setError(null)
              setFecha(e.target.value)
            }}
            className={claseCampo}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Nota (opcional)
          <input
            value={nota}
            maxLength={200}
            autoComplete="off"
            placeholder="Por ejemplo: panorámica"
            onChange={(e) => setNota(e.target.value)}
            className={claseCampo}
          />
        </label>
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
        <Button type="submit" size="lg" disabled={pendiente}>
          {pendiente ? 'Subiendo…' : 'Subir'}
        </Button>
      </SheetFooter>
    </form>
  )
}

function Visor({ archivo: a, onAnulado }: { archivo: Archivo; onAnulado: () => void }) {
  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  return (
    <div className="flex min-h-full flex-col">
      <SheetHeader>
        <SheetTitle>{titulo(a)}</SheetTitle>
        <SheetDescription>{a.nota ?? formatearTamano(a.bytes)}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 py-3 md:px-6">
        {a.url && a.mime !== 'application/pdf' && (
          <img src={a.url} alt={titulo(a)} className="bg-muted w-full rounded-lg object-contain" />
        )}
        {a.url && (
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-muted border-border flex min-h-11 items-center gap-2 self-start rounded-sm border px-3 text-sm font-medium"
          >
            <ArrowSquareOutIcon weight="bold" className="size-4" />
            Abrir {a.mime === 'application/pdf' ? 'el PDF' : 'en tamaño original'}
          </a>
        )}

        {anulando ? (
          <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3 text-sm">
            <p className="text-destructive">
              ¿Anular este archivo? Úsalo solo si se subió por error.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={pendiente} onClick={() => setAnulando(false)}>
                No
              </Button>
              <Button
                variant="destructive"
                disabled={pendiente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await anularArchivo(a.id)
                    if (r.ok) onAnulado()
                    else setError(r.error)
                  })
                }
              >
                Sí, anular
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="self-start" onClick={() => setAnulando(true)}>
            Anular
          </Button>
        )}
      </div>
      {error && (
        <SheetFooter>
          <p
            role="alert"
            className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </p>
        </SheetFooter>
      )}
    </div>
  )
}

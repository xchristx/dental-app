import { useState, useTransition } from 'react'
import { ArrowCounterClockwiseIcon, PaintBrushIcon } from '@phosphor-icons/react'
import { errorDeRegistro, fechaEnZona, textoRegistro, type Cara } from '@dental/core'
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
import { agregarRegistro, anularRegistro } from '@/lib/odontograma/acciones'
import type { Codigo } from '@/lib/odontograma/datos'
import { CarasGrandes } from './caras-grandes'

const ROMANOS = ['I', 'II', 'III', 'IV']

/**
 * Modo pincel: se elige el código una vez y se tocan piezas seguidas en el
 * gráfico. Sin caras se agrega al instante; con caras se abre la pieza
 * grande para elegirlas. Lo último agregado se puede deshacer.
 */
export function usePincel({
  codigos,
  pacienteId,
  organizacionId,
  onActivar,
}: {
  codigos: Codigo[]
  pacienteId: string
  organizacionId: string
  /** Al encender el pincel (por ejemplo, para pasar al gráfico). */
  onActivar?: () => void
}) {
  // null: apagado. '': encendido, sin código elegido todavía.
  const [codigoId, setCodigoId] = useState<string | null>(null)
  const [grado, setGrado] = useState('')
  const [piezaConCaras, setPiezaConCaras] = useState<number | null>(null)
  const [caras, setCaras] = useState<Cara[]>([])
  const [ultimo, setUltimo] = useState<{ id: string; texto: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  const activos = codigos.filter((c) => c.activo)
  const codigo = codigos.find((c) => c.id === codigoId)

  function agregar(pieza: number, carasElegidas: Cara[] | null) {
    if (!codigo) return
    const datos = {
      id: crypto.randomUUID(),
      pacienteId,
      codigoId: codigo.id,
      resuelveId: null,
      pieza,
      caras: carasElegidas,
      grado: codigo.usaGrado && grado ? Number(grado) : null,
      nota: null,
      fecha: fechaEnZona(new Date(), ZONA),
    }
    const falta = errorDeRegistro(codigo, datos)
    if (falta) {
      setError(falta)
      return
    }
    setError(null)
    iniciar(async () => {
      const r = await agregarRegistro(datos, organizacionId)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setUltimo({ id: datos.id, texto: `${textoRegistro(datos, codigo)} en la ${pieza}` })
      setPiezaConCaras(null)
    })
  }

  /** Tocar una pieza con el pincel encendido. */
  function tocar(pieza: number) {
    if (!codigo) {
      setError('Elige primero qué vas a marcar.')
      return
    }
    if (codigo.porCaras) {
      setCaras([])
      setError(null)
      setPiezaConCaras(pieza)
    } else agregar(pieza, null)
  }

  function deshacer() {
    if (!ultimo) return
    iniciar(async () => {
      const r = await anularRegistro(ultimo.id)
      if (r.ok) setUltimo(null)
      else setError(r.error)
    })
  }

  function terminar() {
    setCodigoId(null)
    setGrado('')
    setUltimo(null)
    setError(null)
  }

  const activo = codigoId !== null

  const boton = (
    <Button
      variant={activo ? 'default' : 'outline'}
      aria-pressed={activo}
      onClick={() => {
        if (activo) terminar()
        else {
          setCodigoId('')
          onActivar?.()
        }
      }}
    >
      <PaintBrushIcon weight="bold" />
      Pincel
    </Button>
  )

  const barra = activo && (
    <div className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-sm font-medium">
          Marcar con el pincel
          <select
            value={codigoId ?? ''}
            onChange={(e) => {
              setCodigoId(e.target.value)
              setGrado('')
              setError(null)
            }}
            className={claseCampo}
          >
            <option value="">Elige uno</option>
            <optgroup label="Hallazgos (rojo, a tratar)">
              {activos
                .filter((c) => c.tipo === 'hallazgo')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.abreviatura} · {c.nombre}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Realizados (azul, hecho o en buen estado)">
              {activos
                .filter((c) => c.tipo === 'realizado')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.abreviatura} · {c.nombre}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
        {codigo?.usaGrado && (
          <label className="flex w-32 flex-col gap-1.5 text-sm font-medium">
            Grado
            <select value={grado} onChange={(e) => setGrado(e.target.value)} className={claseCampo}>
              <option value="">Sin grado</option>
              {ROMANOS.map((romano, i) => (
                <option key={romano} value={i + 1}>
                  {romano}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button variant="outline" onClick={terminar}>
          Terminar
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        {codigo
          ? codigo.porCaras
            ? 'Toca una pieza en el gráfico y elige las caras.'
            : 'Cada pieza que toques en el gráfico se marca al instante.'
          : 'Elige qué marcar y después toca las piezas en el gráfico.'}
      </p>
      {/* Avisa lo último que se agregó (y los errores) también al lector de pantalla. */}
      <div role="status" className="empty:hidden">
        {error ? (
          <p className="bg-destructive-bg text-destructive rounded-lg px-3 py-2 text-sm">{error}</p>
        ) : (
          ultimo && (
            <p className="bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm">
              <span>Agregado {ultimo.texto}.</span>
              <Button variant="ghost" size="sm" disabled={pendiente} onClick={deshacer}>
                <ArrowCounterClockwiseIcon weight="bold" />
                Deshacer
              </Button>
            </p>
          )
        )}
      </div>
    </div>
  )

  const hoja = (
    <Sheet
      open={piezaConCaras !== null}
      onOpenChange={(abierta) => !abierta && setPiezaConCaras(null)}
    >
      <SheetContent aria-busy={pendiente}>
        {piezaConCaras !== null && codigo && (
          <form
            className="flex min-h-full flex-col"
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              agregar(piezaConCaras, caras)
            }}
          >
            <SheetHeader>
              <SheetTitle>Pieza {piezaConCaras}</SheetTitle>
              <SheetDescription>
                {codigo.abreviatura} · {codigo.nombre}
                {grado && ` · grado ${ROMANOS[Number(grado) - 1]}`}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 py-3 md:px-6">
              <CarasGrandes
                pieza={piezaConCaras}
                caras={caras}
                tipo={codigo.tipo}
                onCambiar={(nuevas) => {
                  setError(null)
                  setCaras(nuevas)
                }}
              />
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
                {pendiente ? 'Guardando…' : `Agregar a la pieza ${piezaConCaras}`}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )

  return { activo, tocar, boton, barra, hoja }
}

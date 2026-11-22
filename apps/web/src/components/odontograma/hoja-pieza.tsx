import { useState, useTransition } from 'react'
import { TrashIcon } from '@phosphor-icons/react'
import {
  CARAS,
  describirPieza,
  errorDeRegistro,
  fechaEnZona,
  formatearFechaNumerica,
  nombreCara,
  textoRegistro,
  type Cara,
  type RegistroOdontograma,
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
import { agregarRegistro, quitarRegistro } from '@/lib/odontograma/acciones'
import type { Codigo } from '@/lib/odontograma/datos'
import { cn } from '@/lib/utils'

const COLOR_TEXTO = {
  hallazgo: 'text-odontograma-rojo',
  realizado: 'text-odontograma-azul',
} as const
const ROMANOS = ['I', 'II', 'III', 'IV']
// Orden en que se leen las caras alrededor del diente.
const ORDEN_CARAS: Cara[] = ['V', 'M', 'O', 'D', 'L']

interface Form {
  id: string
  codigoId: string
  caras: Cara[]
  grado: string
  nota: string
  fecha: string
}

const formVacio = (hoy: string): Form => ({
  id: crypto.randomUUID(),
  codigoId: '',
  caras: [],
  grado: '',
  nota: '',
  fecha: hoy,
})

/**
 * Registros de una pieza y el formulario para agregar otro. Con dos `piezas`
 * (la permanente y la temporal de la misma fila) se elige cuál.
 */
export function HojaPieza({
  piezas,
  abierta,
  onCerrar,
  registros,
  codigos,
  pacienteId,
  organizacionId,
}: {
  piezas: number[]
  abierta: boolean
  onCerrar: () => void
  registros: RegistroOdontograma[]
  codigos: Codigo[]
  pacienteId: string
  organizacionId: string
}) {
  const hoy = fechaEnZona(new Date(), ZONA)
  const [pieza, setPieza] = useState(piezas[0] ?? 11)
  const [piezasPrevias, setPiezasPrevias] = useState(piezas)
  const [form, setForm] = useState<Form>(() => formVacio(hoy))
  const [error, setError] = useState<string | null>(null)
  const [quitando, setQuitando] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  // Al abrir otra fila, empieza por su primera pieza y con el formulario vacío.
  if (piezas.join() !== piezasPrevias.join()) {
    setPiezasPrevias(piezas)
    setPieza(piezas[0] ?? 11)
    setForm(formVacio(hoy))
    setError(null)
    setQuitando(null)
  }

  const porId = new Map(codigos.map((c) => [c.id, c]))
  const codigo = porId.get(form.codigoId)
  const deLaPieza = registros.filter((r) => r.pieza === pieza)
  const activos = codigos.filter((c) => c.activo)

  const cambiar = (cambios: Partial<Form>) => {
    setError(null)
    setForm((f) => ({ ...f, ...cambios }))
  }

  function agregar(evento: React.FormEvent) {
    evento.preventDefault()
    // Sin código, el registro es una nota sola sobre la pieza.
    const datos = {
      id: form.id,
      pacienteId,
      codigoId: codigo?.id ?? null,
      pieza,
      caras: codigo?.porCaras ? form.caras : null,
      grado: codigo?.usaGrado && form.grado ? Number(form.grado) : null,
      nota: form.nota,
      fecha: form.fecha,
    }
    const falta = errorDeRegistro(codigo ?? null, datos)
    if (falta) {
      setError(falta)
      return
    }
    iniciar(async () => {
      const r = await agregarRegistro(datos, organizacionId)
      if (r.ok) setForm(formVacio(hoy))
      else setError(r.error)
    })
  }

  function quitar(id: string) {
    iniciar(async () => {
      const r = await quitarRegistro(id)
      if (r.ok) setQuitando(null)
      else setError(r.error)
    })
  }

  return (
    <Sheet open={abierta} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent aria-busy={pendiente}>
        <form onSubmit={agregar} className="flex min-h-full flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>Pieza {pieza}</SheetTitle>
            <SheetDescription>{describirPieza(pieza)}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
            {piezas.length > 1 && (
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pieza">
                {piezas.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === pieza ? 'default' : 'outline'}
                    aria-pressed={p === pieza}
                    onClick={() => {
                      setPieza(p)
                      setError(null)
                      setQuitando(null)
                    }}
                  >
                    {p} · {describirPieza(p).split(' · ')[0]}
                  </Button>
                ))}
              </div>
            )}

            <section aria-labelledby="titulo-registros-pieza" className="flex flex-col gap-2">
              <h3 id="titulo-registros-pieza" className="text-sm font-medium">
                Registrado
              </h3>
              {deLaPieza.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nada registrado en esta pieza.</p>
              ) : (
                <ul className="border-border divide-border divide-y rounded-lg border">
                  {deLaPieza.map((r) => {
                    const c = r.codigoId ? porId.get(r.codigoId) : undefined
                    // Una nota sola se muestra en gris, con su texto como título.
                    const etiqueta = c ? textoRegistro(r, c) : 'Nota'
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p>
                              <span
                                className={cn(
                                  'font-medium',
                                  c ? COLOR_TEXTO[c.tipo] : 'text-muted-foreground',
                                )}
                              >
                                {etiqueta}
                              </span>{' '}
                              {c ? c.nombre : r.nota}
                            </p>
                            <p className="text-muted-foreground tabular-nums">
                              {formatearFechaNumerica(r.fecha)}
                              {c && r.nota && ` · ${r.nota}`}
                            </p>
                          </div>
                          {quitando !== r.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="-my-1"
                              aria-label={c ? `Quitar ${etiqueta}` : 'Quitar la nota'}
                              onClick={() => setQuitando(r.id)}
                            >
                              <TrashIcon weight="bold" />
                              Quitar
                            </Button>
                          )}
                        </div>
                        {quitando === r.id && (
                          <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                            <p className="text-destructive">
                              {c
                                ? `¿Quitar ${etiqueta}? Si se trató, agrega también lo realizado.`
                                : '¿Quitar la nota?'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={pendiente}
                                onClick={() => setQuitando(null)}
                              >
                                No
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={pendiente}
                                onClick={() => quitar(r.id)}
                              >
                                Sí, quitar
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="titulo-agregar-pieza" className="flex flex-col gap-4">
              <h3 id="titulo-agregar-pieza" className="text-sm font-medium">
                Agregar
              </h3>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Código
                <select
                  value={form.codigoId}
                  onChange={(e) => cambiar({ codigoId: e.target.value, grado: '' })}
                  className={claseCampo}
                >
                  <option value="">Ninguno: solo una nota</option>
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

              {codigo?.porCaras && (
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium">Caras</legend>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ORDEN_CARAS.map((cara) => {
                      const nombre = nombreCara(cara, pieza)
                      const elegida = form.caras.includes(cara)
                      return (
                        <label
                          key={cara}
                          title={nombre.larga}
                          className={cn(
                            'border-input flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-sm border text-sm transition-colors duration-150',
                            'has-[:focus-visible]:ring-ring/40 has-[:focus-visible]:ring-3',
                            elegida
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card hover:bg-muted',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={elegida}
                            onChange={(e) =>
                              cambiar({
                                caras: e.target.checked
                                  ? CARAS.filter((c) => c === cara || form.caras.includes(c))
                                  : form.caras.filter((c) => c !== cara),
                              })
                            }
                            className="sr-only"
                          />
                          <span className="font-medium">{nombre.corta}</span>
                          <span className="text-[0.6875rem] leading-tight opacity-80">
                            {nombre.larga}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              {codigo?.usaGrado && (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Grado (opcional)
                  <select
                    value={form.grado}
                    onChange={(e) => cambiar({ grado: e.target.value })}
                    className={claseCampo}
                  >
                    <option value="">Sin grado</option>
                    {ROMANOS.map((romano, i) => (
                      <option key={romano} value={i + 1}>
                        {romano}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {codigo ? 'Nota (opcional)' : 'Nota'}
                <input
                  value={form.nota}
                  autoComplete="off"
                  placeholder="Por ejemplo: resina A2"
                  onChange={(e) => cambiar({ nota: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Fecha
                <input
                  type="date"
                  max={hoy}
                  value={form.fecha}
                  onChange={(e) => cambiar({ fecha: e.target.value })}
                  className={claseCampo}
                />
              </label>
            </section>
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
              {pendiente ? 'Guardando…' : `Agregar a la pieza ${pieza}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

import { useId, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, NotePencilIcon, ProhibitIcon } from '@phosphor-icons/react'
import {
  codigoParaTratar,
  describirPieza,
  errorDeRegistro,
  estadoOdontograma,
  evolucionEditable,
  fechaEnZona,
  formatearFechaNumerica,
  textoRegistro,
  type Cara,
  type RadiografiaOdontograma,
  type RegistroOdontograma,
} from '@dental/core'
import { claseCampo } from '@/components/historia/campos'
import { CarasGrandes } from './caras-grandes'
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
import {
  agregarRegistro,
  agregarRx,
  anularRegistro,
  anularRx,
  editarNota,
} from '@/lib/odontograma/acciones'
import { consultaUsuario } from '@/lib/historia/datos'
import type { Codigo, RegistroCargado } from '@/lib/odontograma/datos'
import { cn } from '@/lib/utils'

const COLOR_TEXTO = {
  hallazgo: 'text-odontograma-rojo',
  realizado: 'text-odontograma-azul',
} as const
const ROMANOS = ['I', 'II', 'III', 'IV']

/** Qué abrir: las piezas de la fila y, si viene del plan, el hallazgo a tratar. */
export interface AperturaPieza {
  piezas: number[]
  tratarId: string | null
}

interface Form {
  id: string
  codigoId: string
  caras: Cara[]
  grado: string
  nota: string
  fecha: string
}

const rxVacia = (hoy: string) => ({ id: crypto.randomUUID(), fecha: hoy, nota: '' })

const formVacio = (hoy: string): Form => ({
  id: crypto.randomUUID(),
  codigoId: '',
  caras: [],
  grado: '',
  nota: '',
  fecha: hoy,
})

/**
 * Registros de una pieza y el formulario para agregar otro o para marcar un
 * hallazgo como tratado (0021). Con dos piezas (la permanente y la temporal
 * de la misma fila) se elige cuál.
 */
export function HojaPieza({
  apertura,
  onCerrar,
  registros,
  rx,
  codigos,
  pacienteId,
  organizacionId,
}: {
  apertura: AperturaPieza | null
  onCerrar: () => void
  registros: RegistroCargado[]
  /** Radiografías tomadas del paciente (0023). */
  rx: RadiografiaOdontograma[]
  codigos: Codigo[]
  pacienteId: string
  organizacionId: string
}) {
  const hoy = fechaEnZona(new Date(), ZONA)
  // Mientras se cierra (con animación), se sigue mostrando lo último abierto.
  const [vista, setVista] = useState<AperturaPieza>({ piezas: [11], tratarId: null })
  const [aperturaPrevia, setAperturaPrevia] = useState<AperturaPieza | null>(null)
  const [pieza, setPieza] = useState(11)
  const [form, setForm] = useState<Form>(() => formVacio(hoy))
  const [tratando, setTratando] = useState<RegistroOdontograma | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [anulando, setAnulando] = useState<string | null>(null)
  const [nuevaRx, setNuevaRx] = useState(() => rxVacia(hoy))
  // Corregir la nota de un registro: quien lo cargó, el mismo día (0025).
  const [editando, setEditando] = useState<{ id: string; nota: string } | null>(null)
  const usuario = useQuery(consultaUsuario())
  const [pendiente, iniciar] = useTransition()
  const idFormRx = useId()

  const porId = new Map(codigos.map((c) => [c.id, c]))
  const codigoDe = (r: RegistroOdontograma) => (r.codigoId ? porId.get(r.codigoId) : undefined)
  const realizadosActivos = codigos.filter((c) => c.activo && c.tipo === 'realizado')

  function empezarATratar(hallazgo: RegistroOdontograma) {
    const c = codigoDe(hallazgo)
    const sugerido = c ? codigoParaTratar(c, realizadosActivos) : null
    setTratando(hallazgo)
    setError(null)
    setAnulando(null)
    setForm({
      ...formVacio(hoy),
      codigoId: sugerido?.id ?? '',
      caras: sugerido?.porCaras ? (hallazgo.caras ?? []) : [],
    })
  }

  // Al abrir, empieza por la primera pieza de la fila (o la del hallazgo a tratar).
  if (apertura && apertura !== aperturaPrevia) {
    setAperturaPrevia(apertura)
    setVista(apertura)
    const hallazgo = registros.find((r) => r.id === apertura.tratarId)
    setPieza(hallazgo?.pieza ?? apertura.piezas[0] ?? 11)
    setAnulando(null)
    setEditando(null)
    setError(null)
    setNuevaRx(rxVacia(hoy))
    if (hallazgo) empezarATratar(hallazgo)
    else {
      setTratando(null)
      setForm(formVacio(hoy))
    }
  }

  const { tratadoPor } = estadoOdontograma(registros, codigos)
  const codigo = porId.get(form.codigoId)
  const deLaPieza = registros.filter((r) => r.pieza === pieza)
  const opciones = (tipo: 'hallazgo' | 'realizado') =>
    codigos.filter((c) => c.activo && c.tipo === tipo)

  const cambiar = (cambios: Partial<Form>) => {
    setError(null)
    setForm((f) => ({ ...f, ...cambios }))
  }

  function cancelarTratamiento() {
    setTratando(null)
    setForm(formVacio(hoy))
    setError(null)
  }

  function agregar(evento: React.FormEvent) {
    evento.preventDefault()
    // Sin código, el registro es una nota sola sobre la pieza.
    const datos = {
      id: form.id,
      pacienteId,
      codigoId: codigo?.id ?? null,
      resuelveId: tratando?.id ?? null,
      pieza,
      caras: codigo?.porCaras ? form.caras : null,
      grado: codigo?.usaGrado && form.grado ? Number(form.grado) : null,
      nota: form.nota,
      fecha: form.fecha,
    }
    if (tratando && !codigo) {
      setError('Elige qué se hizo.')
      return
    }
    const falta = errorDeRegistro(codigo ?? null, datos)
    if (falta) {
      setError(falta)
      return
    }
    iniciar(async () => {
      const r = await agregarRegistro(datos, organizacionId)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setTratando(null)
      setForm(formVacio(hoy))
    })
  }

  function anular(id: string) {
    iniciar(async () => {
      const r = await anularRegistro(id)
      if (r.ok) setAnulando(null)
      else setError(r.error)
    })
  }

  function guardarNota(r: RegistroCargado) {
    if (!editando) return
    iniciar(async () => {
      const resultado = await editarNota(r.id, editando.nota, r.codigoId === null)
      if (resultado.ok) setEditando(null)
      else setError(resultado.error)
    })
  }

  // Radiografías (0023): un formulario aparte, para que Enter no agregue un registro.
  function agregarRadiografia(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)
    iniciar(async () => {
      const r = await agregarRx({ ...nuevaRx, pacienteId, pieza }, organizacionId)
      if (r.ok) setNuevaRx(rxVacia(hoy))
      else setError(r.error)
    })
  }

  function anularRadiografia(id: string) {
    iniciar(async () => {
      const r = await anularRx(id)
      if (r.ok) setAnulando(null)
      else setError(r.error)
    })
  }

  const rxDeLaPieza = rx.filter((r) => r.pieza === pieza)

  const tratandoCodigo = tratando ? codigoDe(tratando) : undefined

  return (
    <Sheet open={apertura !== null} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent aria-busy={pendiente}>
        <form onSubmit={agregar} className="flex min-h-full flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>Pieza {pieza}</SheetTitle>
            <SheetDescription>{describirPieza(pieza)}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
            {vista.piezas.length > 1 && (
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pieza">
                {vista.piezas.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === pieza ? 'default' : 'outline'}
                    aria-pressed={p === pieza}
                    onClick={() => {
                      setPieza(p)
                      setError(null)
                      setAnulando(null)
                      if (tratando && tratando.pieza !== p) cancelarTratamiento()
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
                    const c = codigoDe(r)
                    // Una nota sola se muestra en gris, con su texto como título.
                    const etiqueta = c ? textoRegistro(r, c) : 'Nota'
                    const tratadoCon = tratadoPor.get(r.id)
                    const codigoTratamiento = tratadoCon ? codigoDe(tratadoCon) : undefined
                    const resuelto = r.resuelveId
                      ? registros.find((x) => x.id === r.resuelveId)
                      : undefined
                    const codigoResuelto = resuelto ? codigoDe(resuelto) : undefined
                    const esPendiente = c?.tipo === 'hallazgo' && !tratadoCon
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm">
                        <div className={cn(tratadoCon && 'opacity-60')}>
                          <p>
                            <span
                              className={cn(
                                'font-medium',
                                c ? COLOR_TEXTO[c.tipo] : 'text-muted-foreground',
                                tratadoCon && 'line-through',
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
                          {tratadoCon && (
                            <p className="text-muted-foreground tabular-nums">
                              Tratado el {formatearFechaNumerica(tratadoCon.fecha)}
                              {codigoTratamiento &&
                                ` con ${textoRegistro(tratadoCon, codigoTratamiento)}`}
                            </p>
                          )}
                          {resuelto && codigoResuelto && (
                            <p className="text-muted-foreground">
                              Trató {textoRegistro(resuelto, codigoResuelto)}
                            </p>
                          )}
                        </div>

                        {editando?.id === r.id && (
                          <div className="flex flex-col gap-2">
                            <label className="flex flex-col gap-1.5 font-medium">
                              Corregir la nota
                              <input
                                value={editando.nota}
                                autoComplete="off"
                                maxLength={500}
                                onChange={(e) => {
                                  setError(null)
                                  setEditando({ id: r.id, nota: e.target.value })
                                }}
                                // Enter guarda la nota, no agrega un registro.
                                onKeyDown={(e) => {
                                  if (e.key !== 'Enter' || e.nativeEvent.isComposing) return
                                  e.preventDefault()
                                  guardarNota(r)
                                }}
                                className={claseCampo}
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={pendiente}
                                onClick={() => setEditando(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                disabled={pendiente}
                                onClick={() => guardarNota(r)}
                              >
                                Guardar nota
                              </Button>
                            </div>
                          </div>
                        )}

                        {!tratadoCon && anulando !== r.id && editando?.id !== r.id && (
                          <div className="flex flex-wrap gap-2">
                            {evolucionEditable(
                              { autorId: r.autorId, creadaEn: r.creadoEn },
                              usuario.data ?? null,
                              new Date(),
                            ) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                aria-label={c ? `Editar la nota de ${etiqueta}` : 'Editar la nota'}
                                onClick={() => {
                                  setError(null)
                                  setAnulando(null)
                                  setEditando({ id: r.id, nota: r.nota ?? '' })
                                }}
                              >
                                <NotePencilIcon weight="bold" />
                                {r.nota ? 'Editar nota' : 'Agregar nota'}
                              </Button>
                            )}
                            {esPendiente && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                aria-label={`Marcar ${etiqueta} como tratado`}
                                onClick={() => empezarATratar(r)}
                              >
                                <CheckIcon weight="bold" />
                                Marcar como tratado
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={c ? `Anular ${etiqueta}` : 'Anular la nota'}
                              onClick={() => setAnulando(r.id)}
                            >
                              <ProhibitIcon weight="bold" />
                              Anular
                            </Button>
                          </div>
                        )}

                        {anulando === r.id && (
                          <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                            <p className="text-destructive">
                              {c ? `¿Anular ${etiqueta}?` : '¿Anular la nota?'} Úsalo solo si se
                              cargó por error.
                              {resuelto && ' El hallazgo que trató vuelve a quedar pendiente.'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={pendiente}
                                onClick={() => setAnulando(null)}
                              >
                                No
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={pendiente}
                                onClick={() => anular(r.id)}
                              >
                                Sí, anular
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

            <section aria-labelledby="titulo-rx-pieza" className="flex flex-col gap-2">
              <h3 id="titulo-rx-pieza" className="text-sm font-medium">
                Radiografías (Rx)
              </h3>
              {rxDeLaPieza.length > 0 && (
                <ul className="border-border divide-border divide-y rounded-lg border text-sm">
                  {rxDeLaPieza.map((r) => {
                    const fecha = formatearFechaNumerica(r.fecha)
                    return (
                      <li key={r.id} className="flex flex-col gap-2 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="tabular-nums">
                            <CheckIcon
                              weight="bold"
                              aria-hidden="true"
                              className="mr-1.5 inline size-4 align-[-0.125em]"
                            />
                            Rx del {fecha}
                            {r.nota && <span className="text-muted-foreground"> · {r.nota}</span>}
                          </p>
                          {anulando !== r.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Anular la Rx del ${fecha}`}
                              onClick={() => setAnulando(r.id)}
                            >
                              <ProhibitIcon weight="bold" />
                              Anular
                            </Button>
                          )}
                        </div>
                        {anulando === r.id && (
                          <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                            <p className="text-destructive">
                              ¿Anular la Rx del {fecha}? Úsalo solo si se cargó por error.
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={pendiente}
                                onClick={() => setAnulando(null)}
                              >
                                No
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                disabled={pendiente}
                                onClick={() => anularRadiografia(r.id)}
                              >
                                Sí, anular
                              </Button>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-end gap-2">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Tomada el
                  <input
                    form={idFormRx}
                    type="date"
                    max={hoy}
                    value={nuevaRx.fecha}
                    onChange={(e) => setNuevaRx((x) => ({ ...x, fecha: e.target.value }))}
                    className={cn(claseCampo, 'min-w-0')}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Detalle (opcional)
                  <input
                    form={idFormRx}
                    value={nuevaRx.nota}
                    autoComplete="off"
                    placeholder="Periapical"
                    onChange={(e) => setNuevaRx((x) => ({ ...x, nota: e.target.value }))}
                    className={cn(claseCampo, 'min-w-0')}
                  />
                </label>
              </div>
              <Button
                form={idFormRx}
                type="submit"
                variant="outline"
                className="self-start"
                disabled={pendiente}
              >
                <CheckIcon weight="bold" />
                Agregar Rx a la pieza {pieza}
              </Button>
            </section>

            <section aria-labelledby="titulo-agregar-pieza" className="flex flex-col gap-4">
              <h3 id="titulo-agregar-pieza" className="text-sm font-medium">
                {tratando ? 'Marcar como tratado' : 'Agregar'}
              </h3>

              {tratando && tratandoCodigo && (
                <div className="bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm">
                  <p>
                    Tratando{' '}
                    <span className={cn('font-medium', COLOR_TEXTO.hallazgo)}>
                      {textoRegistro(tratando, tratandoCodigo)}
                    </span>{' '}
                    {tratandoCodigo.nombre.toLowerCase()}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={cancelarTratamiento}>
                    Cancelar
                  </Button>
                </div>
              )}

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {tratando ? 'Qué se hizo' : 'Código'}
                <select
                  value={form.codigoId}
                  onChange={(e) => {
                    const nuevo = porId.get(e.target.value)
                    cambiar({
                      codigoId: e.target.value,
                      grado: '',
                      // Al tratar, las caras del hallazgo quedan elegidas.
                      ...(tratando && nuevo?.porCaras && { caras: tratando.caras ?? [] }),
                    })
                  }}
                  className={claseCampo}
                >
                  {tratando ? (
                    <option value="">Elige uno</option>
                  ) : (
                    <option value="">Ninguno: solo una nota</option>
                  )}
                  {!tratando && (
                    <optgroup label="Hallazgos (rojo, a tratar)">
                      {opciones('hallazgo').map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.abreviatura} · {c.nombre}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Realizados (azul, hecho o en buen estado)">
                    {opciones('realizado').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.abreviatura} · {c.nombre}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              {codigo?.porCaras && (
                <CarasGrandes
                  pieza={pieza}
                  caras={form.caras}
                  tipo={codigo.tipo}
                  onCambiar={(caras) => cambiar({ caras })}
                />
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
              {pendiente
                ? 'Guardando…'
                : tratando
                  ? 'Guardar tratamiento'
                  : `Agregar a la pieza ${pieza}`}
            </Button>
          </SheetFooter>
        </form>
        {/* Los campos de la Rx apuntan acá con el atributo form: no se anidan formularios. */}
        <form id={idFormRx} onSubmit={agregarRadiografia} noValidate hidden />
      </SheetContent>
    </Sheet>
  )
}

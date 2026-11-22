import { useId, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CoinsIcon, PlusIcon, SlidersHorizontalIcon } from '@phosphor-icons/react'
import {
  FORMAS_PAGO,
  NOMBRE_FORMA_PAGO,
  fechaEnZona,
  formatearFechaNumerica,
  formatearMonto,
  montoSugerido,
  numeroDeRecibo,
  parsearMonto,
  planillaDePagos,
  type DatosRecibo,
  type FormaPago,
} from '@dental/core'
import { claseCampo } from '@/components/historia/campos'
import { HojaRecibo } from '@/components/pagos/recibo'
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
  anularPresupuesto,
  crearPresupuesto,
  registrarAjuste,
  registrarPago,
  type ResultadoPagos,
} from '@/lib/pagos/acciones'
import { consultaPagos, type PagosDelPaciente, type Presupuesto } from '@/lib/pagos/datos'
import { cn } from '@/lib/utils'

/** "Bs 400" escrito en el campo, sin el "Bs" (va como prefijo). */
const textoDeMonto = (centavos: number | null) =>
  centavos === null ? '' : formatearMonto(centavos).replace('Bs ', '')

/** El N.º de recibo de la planilla: abre el recibo para mandarlo (0028). */
function BotonRecibo({ numero, onClick }: { numero: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver el recibo ${numeroDeRecibo(numero)}`}
      className="decoration-muted-foreground hover:text-foreground focus-visible:ring-ring/40 inline-flex min-h-6 items-center rounded-sm font-mono whitespace-nowrap underline underline-offset-2 outline-none focus-visible:ring-3"
    >
      {numeroDeRecibo(numero)}
    </button>
  )
}

type Formulario =
  | { tipo: 'presupuesto' }
  | { tipo: 'pago'; presupuesto: Presupuesto }
  | { tipo: 'ajuste'; presupuesto: Presupuesto }
  | { tipo: 'recibo'; movimientoId: string }

/** Los datos del recibo de un pago (0028), con los saldos de su fila en la planilla. */
function datosDeRecibo(pagos: PagosDelPaciente, movimientoId: string): DatosRecibo | null {
  for (const p of pagos.presupuestos) {
    const fila = planillaDePagos(p.totalCentavos, p.movimientos).filas.find(
      (f) => f.movimiento.id === movimientoId,
    )
    const m = fila?.movimiento
    if (!fila || !m || m.tipo !== 'pago' || !m.numeroRecibo || !m.formaPago) continue
    return {
      consultorio: pagos.consultorio,
      numero: m.numeroRecibo,
      fecha: m.fecha,
      paciente: pagos.paciente.nombre,
      montoCentavos: m.montoCentavos,
      formaPago: m.formaPago,
      concepto: p.descripcion,
      saldoAnteriorCentavos: fila.saldoAnterior,
      saldoActualCentavos: fila.saldoActual,
      profesional: m.profesional,
    }
  }
  return null
}

/** Presupuestos y libro de pagos del paciente (0026). */
export function SeccionPagos({ pacienteId }: { pacienteId: string }) {
  const pagos = useQuery(consultaPagos(pacienteId))
  const [abierto, setAbierto] = useState<Formulario | null>(null)
  const recibo =
    abierto?.tipo === 'recibo' && pagos.data
      ? datosDeRecibo(pagos.data, abierto.movimientoId)
      : null

  return (
    <section aria-labelledby="titulo-pagos" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-pagos" className="text-lg font-medium">
          Pagos
        </h2>
        <Button variant="outline" onClick={() => setAbierto({ tipo: 'presupuesto' })}>
          <PlusIcon weight="bold" />
          Nuevo presupuesto
        </Button>
      </div>

      {!pagos.data ? (
        <div
          aria-busy="true"
          aria-label="Cargando los pagos"
          className="bg-muted h-32 rounded-lg"
        />
      ) : pagos.data.presupuestos.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin presupuestos. Carga el costo total del tratamiento para llevar la planilla de pagos.
        </p>
      ) : (
        pagos.data.presupuestos.map((p) => (
          <TarjetaPresupuesto
            key={p.id}
            presupuesto={p}
            onPago={() => setAbierto({ tipo: 'pago', presupuesto: p })}
            onAjuste={() => setAbierto({ tipo: 'ajuste', presupuesto: p })}
            onRecibo={(movimientoId) => setAbierto({ tipo: 'recibo', movimientoId })}
          />
        ))
      )}

      {pagos.data && (
        <Sheet open={abierto !== null} onOpenChange={(a) => !a && setAbierto(null)}>
          <SheetContent>
            {abierto?.tipo === 'presupuesto' && (
              <FormPresupuesto
                pacienteId={pacienteId}
                organizacionId={pagos.data.organizacionId}
                onListo={() => setAbierto(null)}
              />
            )}
            {abierto?.tipo === 'pago' && (
              <FormPago
                presupuesto={abierto.presupuesto}
                organizacionId={pagos.data.organizacionId}
                // Guardado el pago, se abre su recibo listo para mandar (0028).
                onGuardado={(movimientoId) => setAbierto({ tipo: 'recibo', movimientoId })}
              />
            )}
            {abierto?.tipo === 'recibo' &&
              (recibo ? (
                <HojaRecibo recibo={recibo} telefono={pagos.data.paciente.telefono} />
              ) : (
                <div aria-busy="true" aria-label="Cargando el recibo" className="p-6">
                  <div className="bg-muted h-64 rounded-lg" />
                </div>
              ))}
            {abierto?.tipo === 'ajuste' && (
              <FormAjuste
                presupuesto={abierto.presupuesto}
                organizacionId={pagos.data.organizacionId}
                onListo={() => setAbierto(null)}
              />
            )}
          </SheetContent>
        </Sheet>
      )}
    </section>
  )
}

function TarjetaPresupuesto({
  presupuesto: p,
  onPago,
  onAjuste,
  onRecibo,
}: {
  presupuesto: Presupuesto
  onPago: () => void
  onAjuste: () => void
  onRecibo: (movimientoId: string) => void
}) {
  const { filas, saldo, pagado } = planillaDePagos(p.totalCentavos, p.movimientos)
  const idTitulo = useId()
  const [anulando, setAnulando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  function anular() {
    iniciar(async () => {
      const r = await anularPresupuesto(p.id)
      if (!r.ok) setError(r.error)
    })
  }

  return (
    <article
      aria-labelledby={idTitulo}
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={idTitulo} className="font-medium">
            {p.descripcion}
          </h3>
          <p className="text-muted-foreground text-sm tabular-nums">
            Desde el {formatearFechaNumerica(p.fecha)}
            {p.profesional && ` · ${p.profesional}`}
          </p>
        </div>
        {saldo === 0 && (
          <span className="bg-muted rounded-full px-2 py-0.5 text-sm font-medium">Pagado</span>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd className="font-medium">{formatearMonto(p.totalCentavos)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Pagado</dt>
          <dd className="font-medium">{formatearMonto(pagado)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Saldo</dt>
          <dd className="text-base font-semibold">{formatearMonto(saldo)}</dd>
        </div>
      </dl>
      {(p.cuotaInicialCentavos || p.cuotaSugeridaCentavos) && (
        <p className="text-muted-foreground text-sm tabular-nums">
          {[
            p.cuotaInicialCentavos && `Cuota inicial ${formatearMonto(p.cuotaInicialCentavos)}`,
            p.cuotaSugeridaCentavos && `cuotas de ${formatearMonto(p.cuotaSugeridaCentavos)}`,
          ]
            .filter(Boolean)
            .join(' y ')}
        </p>
      )}

      {filas.length > 0 && (
        // La planilla como la de papel. Si la tarjeta es angosta (celular), el saldo
        // anterior se oculta (es el actual de la fila de arriba) y el recibo va
        // debajo del monto: así el saldo actual se ve sin deslizar.
        <div
          role="region"
          aria-labelledby={`${idTitulo}-planilla`}
          tabIndex={0}
          className="focus-visible:ring-ring/40 @container -mx-3 overflow-x-auto outline-none focus-visible:ring-3"
        >
          <table className="w-full text-sm tabular-nums">
            <caption id={`${idTitulo}-planilla`} className="sr-only">
              Planilla de pagos de {p.descripcion}
            </caption>
            <thead className="text-muted-foreground border-border border-y text-left">
              <tr>
                <th scope="col" className="bg-card sticky left-0 px-3 py-2 font-normal">
                  Fecha
                </th>
                <th scope="col" className="px-3 py-2 font-normal">
                  Abonado
                </th>
                <th scope="col" className="hidden px-3 py-2 text-right font-normal @md:table-cell">
                  Saldo anterior
                </th>
                <th scope="col" className="px-3 py-2 text-right font-normal">
                  Saldo actual
                </th>
                <th scope="col" className="hidden px-3 py-2 text-right font-normal @md:table-cell">
                  Recibo
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {filas.map(({ movimiento: m, saldoAnterior, saldoActual }) => (
                <tr key={m.id} className="align-top">
                  <th scope="row" className="bg-card sticky left-0 px-3 py-2 text-left font-normal">
                    {formatearFechaNumerica(m.fecha)}
                  </th>
                  <td className="px-3 py-2">
                    {m.tipo === 'pago' ? (
                      <>
                        <span className="font-medium">{formatearMonto(m.montoCentavos)}</span>
                        {m.formaPago && (
                          <span className="text-muted-foreground block">
                            {NOMBRE_FORMA_PAGO[m.formaPago]}
                            {m.numeroRecibo && (
                              <span className="@md:hidden">
                                {' · '}
                                <BotonRecibo
                                  numero={m.numeroRecibo}
                                  onClick={() => onRecibo(m.id)}
                                />
                              </span>
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-medium">
                          Ajuste {formatearMonto(m.montoCentavos, { signo: true })}
                        </span>
                        <span className="text-muted-foreground block">{m.motivo}</span>
                      </>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 text-right @md:table-cell">
                    {formatearMonto(saldoAnterior)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatearMonto(saldoActual)}
                  </td>
                  <td className="hidden px-3 py-2 text-right @md:table-cell">
                    {m.numeroRecibo ? (
                      <BotonRecibo numero={m.numeroRecibo} onClick={() => onRecibo(m.id)} />
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {anulando ? (
        <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3 text-sm">
          <p className="text-destructive">
            ¿Anular este presupuesto? Úsalo solo si se cargó por error.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" disabled={pendiente} onClick={() => setAnulando(false)}>
              No
            </Button>
            <Button variant="destructive" disabled={pendiente} onClick={anular}>
              Sí, anular
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {saldo > 0 && (
            <Button onClick={onPago} aria-label={`Registrar pago de ${p.descripcion}`}>
              <CoinsIcon weight="bold" />
              Registrar pago
            </Button>
          )}
          <Button variant="outline" onClick={onAjuste} aria-label={`Ajuste de ${p.descripcion}`}>
            <SlidersHorizontalIcon weight="bold" />
            Ajuste
          </Button>
          {p.movimientos.length === 0 && (
            <Button variant="ghost" onClick={() => setAnulando(true)}>
              Anular
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </article>
  )
}

/** Un campo de monto: texto con teclado numérico, "Bs" delante. */
function CampoMonto({
  etiqueta,
  valor,
  onCambiar,
  ayuda,
}: {
  etiqueta: string
  valor: string
  onCambiar: (v: string) => void
  ayuda?: string
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {etiqueta}
        <span className="relative">
          <span
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center font-normal"
          >
            Bs
          </span>
          <input
            value={valor}
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            aria-describedby={ayuda ? `${id}-ayuda` : undefined}
            onChange={(e) => onCambiar(e.target.value)}
            className={cn(claseCampo, 'pl-10 font-normal tabular-nums')}
          />
        </span>
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-muted-foreground text-sm">
          {ayuda}
        </p>
      )}
    </div>
  )
}

function CampoFecha({ valor, onCambiar }: { valor: string; onCambiar: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      Fecha
      <input
        type="date"
        max={fechaEnZona(new Date(), ZONA)}
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        className={claseCampo}
      />
    </label>
  )
}

/** Envoltorio común de los formularios: título, cuerpo, error y botón. */
function Hoja({
  titulo,
  descripcion,
  boton,
  error,
  guardando,
  onGuardar,
  children,
}: {
  titulo: string
  descripcion: string
  boton: string
  error: string | null
  guardando: boolean
  onGuardar: () => void
  children: React.ReactNode
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar()
      }}
      className="flex min-h-full flex-col"
      noValidate
    >
      <SheetHeader>
        <SheetTitle>{titulo}</SheetTitle>
        <SheetDescription>{descripcion}</SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-5 px-4 py-3 md:px-6">{children}</div>
      <SheetFooter className="border-border bg-popover sticky bottom-0 border-t">
        {error && (
          <p
            role="alert"
            className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={guardando}>
          {guardando ? 'Guardando…' : boton}
        </Button>
      </SheetFooter>
    </form>
  )
}

/** Guarda y cierra, o muestra el error. */
function useGuardar(onListo: () => void) {
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()
  const guardar = (accion: () => Promise<ResultadoPagos>) =>
    iniciar(async () => {
      const r = await accion()
      if (r.ok) onListo()
      else setError(r.error)
    })
  /** Un setter que además borra el error: se corrige el dato, se va el aviso. */
  const limpiando =
    <T,>(set: (valor: T) => void) =>
    (valor: T) => {
      setError(null)
      set(valor)
    }
  return { error, setError, guardando, guardar, limpiando }
}

/** null si está vacío; NaN si está mal escrito. */
const leerMonto = (texto: string) => (texto.trim() ? (parsearMonto(texto) ?? Number.NaN) : null)

function FormPresupuesto({
  pacienteId,
  organizacionId,
  onListo,
}: {
  pacienteId: string
  organizacionId: string
  onListo: () => void
}) {
  const [id] = useState(() => crypto.randomUUID())
  const [descripcion, setDescripcion] = useState('')
  const [total, setTotal] = useState('')
  const [inicial, setInicial] = useState('')
  const [sugerida, setSugerida] = useState('')
  const [fecha, setFecha] = useState(() => fechaEnZona(new Date(), ZONA))
  const { error, setError, guardando, guardar, limpiando } = useGuardar(onListo)

  function enviar() {
    const montos = [leerMonto(total), leerMonto(inicial), leerMonto(sugerida)]
    if (montos.some((m) => Number.isNaN(m))) {
      setError('Revisa los montos: por ejemplo, 6.500 o 400,50.')
      return
    }
    const [totalCentavos, cuotaInicialCentavos, cuotaSugeridaCentavos] = montos
    guardar(() =>
      crearPresupuesto(
        {
          id,
          pacienteId,
          descripcion,
          totalCentavos: totalCentavos ?? 0,
          cuotaInicialCentavos: cuotaInicialCentavos ?? null,
          cuotaSugeridaCentavos: cuotaSugeridaCentavos ?? null,
          fecha,
        },
        organizacionId,
      ),
    )
  }

  return (
    <Hoja
      titulo="Nuevo presupuesto"
      descripcion="El costo total que le explicaste al paciente. Después no se cambia: si el precio cambia, se registra un ajuste."
      boton="Guardar presupuesto"
      error={error}
      guardando={guardando}
      onGuardar={enviar}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Tratamiento
        <input
          value={descripcion}
          autoComplete="off"
          placeholder="Por ejemplo: ortodoncia"
          onChange={(e) => {
            setError(null)
            setDescripcion(e.target.value)
          }}
          className={claseCampo}
        />
      </label>
      <CampoMonto etiqueta="Total" valor={total} onCambiar={limpiando(setTotal)} />
      <div className="grid grid-cols-2 gap-3">
        <CampoMonto
          etiqueta="Cuota inicial (opcional)"
          valor={inicial}
          onCambiar={limpiando(setInicial)}
        />
        <CampoMonto
          etiqueta="Cuota sugerida (opcional)"
          valor={sugerida}
          onCambiar={limpiando(setSugerida)}
        />
      </div>
      <CampoFecha valor={fecha} onCambiar={setFecha} />
    </Hoja>
  )
}

function FormPago({
  presupuesto: p,
  organizacionId,
  onGuardado,
}: {
  presupuesto: Presupuesto
  organizacionId: string
  /** Con el id del pago, para abrir su recibo. */
  onGuardado: (movimientoId: string) => void
}) {
  const { saldo } = planillaDePagos(p.totalCentavos, p.movimientos)
  const hayPagos = p.movimientos.some((m) => m.tipo === 'pago')
  const [id] = useState(() => crypto.randomUUID())
  const [monto, setMonto] = useState(() => textoDeMonto(montoSugerido(p, saldo, hayPagos)))
  const [forma, setForma] = useState<FormaPago | ''>('')
  const [fecha, setFecha] = useState(() => fechaEnZona(new Date(), ZONA))
  const { error, setError, guardando, guardar, limpiando } = useGuardar(() => onGuardado(id))

  function enviar() {
    const centavos = leerMonto(monto)
    if (centavos === null || Number.isNaN(centavos)) {
      setError('Escribe el monto: por ejemplo, 400 o 400,50.')
      return
    }
    if (centavos > saldo) {
      setError(`El pago supera el saldo (${formatearMonto(saldo)}).`)
      return
    }
    guardar(() =>
      registrarPago(
        { id, presupuestoId: p.id, montoCentavos: centavos, formaPago: forma, fecha },
        organizacionId,
      ),
    )
  }

  return (
    <Hoja
      titulo="Registrar pago"
      descripcion={`${p.descripcion} · saldo ${formatearMonto(saldo)}`}
      boton="Guardar pago"
      error={error}
      guardando={guardando}
      onGuardar={enviar}
    >
      <CampoMonto
        etiqueta="Monto"
        valor={monto}
        onCambiar={limpiando(setMonto)}
        ayuda={hayPagos ? 'Propone la cuota sugerida.' : 'Propone la cuota inicial.'}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1.5 text-sm font-medium">Forma de pago</legend>
        <div className="flex flex-wrap gap-x-5">
          {FORMAS_PAGO.map((f) => (
            <label key={f} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="forma"
                checked={forma === f}
                onChange={() => {
                  setError(null)
                  setForma(f)
                }}
                className="accent-primary size-5 shrink-0"
              />
              {NOMBRE_FORMA_PAGO[f]}
            </label>
          ))}
        </div>
      </fieldset>
      <CampoFecha valor={fecha} onCambiar={setFecha} />
    </Hoja>
  )
}

function FormAjuste({
  presupuesto: p,
  organizacionId,
  onListo,
}: {
  presupuesto: Presupuesto
  organizacionId: string
  onListo: () => void
}) {
  const { saldo } = planillaDePagos(p.totalCentavos, p.movimientos)
  const [id] = useState(() => crypto.randomUUID())
  const [sentido, setSentido] = useState<'sube' | 'baja'>('sube')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState(() => fechaEnZona(new Date(), ZONA))
  const { error, setError, guardando, guardar, limpiando } = useGuardar(onListo)

  function enviar() {
    const centavos = leerMonto(monto)
    if (centavos === null || Number.isNaN(centavos) || centavos === 0) {
      setError('Escribe el monto: por ejemplo, 400 o 400,50.')
      return
    }
    if (sentido === 'baja' && centavos > saldo) {
      setError(`No puede bajar más que el saldo (${formatearMonto(saldo)}).`)
      return
    }
    guardar(() =>
      registrarAjuste(
        {
          id,
          presupuestoId: p.id,
          montoCentavos: sentido === 'sube' ? centavos : -centavos,
          motivo,
          fecha,
        },
        organizacionId,
      ),
    )
  }

  return (
    <Hoja
      titulo="Ajuste"
      descripcion={`${p.descripcion} · saldo ${formatearMonto(saldo)}. Para corregir un error o un cambio de precio: queda a la vista en la planilla.`}
      boton="Guardar ajuste"
      error={error}
      guardando={guardando}
      onGuardar={enviar}
    >
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1.5 text-sm font-medium">El ajuste</legend>
        {(
          [
            ['sube', 'Sube el saldo', 'Por ejemplo, se agregó un tratamiento.'],
            ['baja', 'Baja el saldo', 'Por ejemplo, un descuento o un pago mal cargado.'],
          ] as const
        ).map(([valor, texto, ejemplo]) => (
          <label key={valor} className="flex items-start gap-3 py-1.5 text-sm">
            <input
              type="radio"
              name="sentido"
              checked={sentido === valor}
              onChange={() => {
                setError(null)
                setSentido(valor)
              }}
              className="accent-primary mt-0.5 size-5 shrink-0"
            />
            <span>
              <span className="font-medium">{texto}</span>
              <span className="text-muted-foreground block">{ejemplo}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <CampoMonto etiqueta="Monto" valor={monto} onCambiar={limpiando(setMonto)} />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Motivo
        <input
          value={motivo}
          autoComplete="off"
          onChange={(e) => {
            setError(null)
            setMotivo(e.target.value)
          }}
          className={claseCampo}
        />
      </label>
      <CampoFecha valor={fecha} onCambiar={setFecha} />
    </Hoja>
  )
}

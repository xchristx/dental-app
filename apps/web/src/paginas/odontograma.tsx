import { useEffect, useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { CaretLeftIcon, CheckIcon } from '@phosphor-icons/react'
import {
  ARCADAS,
  FILAS_ODONTOGRAMA,
  calcularIndices,
  esSuperior,
  estadoOdontograma,
  fechasDelOdontograma,
  formatearFechaNumerica,
  registrosAlDia,
  textoRegistro,
  type RadiografiaOdontograma,
  type RegistroOdontograma,
} from '@dental/core'
import { Diente } from '@/components/odontograma/diente'
import { SeccionExamenBucal } from '@/components/odontograma/examen-bucal'
import { HojaPieza, type AperturaPieza } from '@/components/odontograma/hoja-pieza'
import { usePincel } from '@/components/odontograma/pincel'
import { Enlace } from '@/components/enlace'
import { Button } from '@/components/ui/button'
import { tituloDePagina } from '@/lib/navegacion'
import { consultaOdontograma, type Codigo, type Odontograma } from '@/lib/odontograma/datos'
import { fichaDePaciente } from '@/lib/pacientes/datos'
import { cn } from '@/lib/utils'
import { PaginaNoEncontrada } from './no-encontrada'

type Vista = 'grafico' | 'tabla'

const COLOR_TEXTO = {
  hallazgo: 'text-odontograma-rojo',
  realizado: 'text-odontograma-azul',
} as const

/** Odontograma de un paciente (0020): tabla como su ficha y gráfico de cinco caras. */
export function PaginaOdontograma() {
  const { id = '' } = useParams({ strict: false })
  const paciente = useQuery({ queryKey: ['paciente', id], queryFn: () => fichaDePaciente(id) })
  const odontograma = useQuery(consultaOdontograma(id))
  const nombre = paciente.data?.nombre
  useEffect(() => tituloDePagina(nombre ? `Odontograma · ${nombre}` : 'Odontograma'), [nombre])

  if (paciente.data === null || odontograma.data === null) return <PaginaNoEncontrada />

  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <Enlace
        href={`/pacientes/${id}`}
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 items-center gap-1 self-start text-sm"
      >
        <CaretLeftIcon weight="bold" className="size-4" />
        {nombre ?? 'Paciente'}
      </Enlace>
      <h1 className="text-2xl font-medium">Odontograma</h1>
      {odontograma.data ? (
        <Contenido pacienteId={id} datos={odontograma.data} />
      ) : (
        <div
          aria-busy="true"
          aria-label="Cargando el odontograma"
          className="bg-muted h-96 rounded-lg"
        />
      )}
    </main>
  )
}

function Contenido({ pacienteId, datos }: { pacienteId: string; datos: Odontograma }) {
  // En pantallas anchas se ve mejor el gráfico; en el celular, la tabla.
  const [vista, setVista] = useState<Vista>(() =>
    window.matchMedia('(min-width: 48rem)').matches ? 'grafico' : 'tabla',
  )
  const [apertura, setApertura] = useState<AperturaPieza | null>(null)
  const abrir = (piezas: number[], tratarId: string | null = null) =>
    setApertura({ piezas, tratarId })
  const codigos = new Map(datos.codigos.map((c) => [c.id, c]))
  // Ver la boca en un día anterior: solo para mirar. null es hoy.
  const fechas = fechasDelOdontograma([...datos.registros, ...datos.rx, ...datos.examenes])
  const [dia, setDia] = useState<string | null>(null)
  const ultimo = fechas.at(-1)
  const pasado = dia !== null && ultimo !== undefined && dia < ultimo ? dia : null
  const registros = pasado ? registrosAlDia(datos.registros, pasado) : datos.registros
  // Radiografías tomadas (0023), hasta el día que se mira.
  const rxPorPieza = new Map<number, RadiografiaOdontograma[]>()
  for (const r of pasado ? registrosAlDia(datos.rx, pasado) : datos.rx) {
    rxPorPieza.set(r.pieza, [...(rxPorPieza.get(r.pieza) ?? []), r])
  }
  // Los hallazgos ya tratados no se dibujan ni cuentan: queda lo realizado (0021).
  const { vigentes, pendientes } = estadoOdontograma(registros, datos.codigos)
  const indices = calcularIndices(vigentes, datos.codigos)
  const porPieza = new Map<number, RegistroOdontograma[]>()
  for (const r of vigentes) porPieza.set(r.pieza, [...(porPieza.get(r.pieza) ?? []), r])
  // El pincel trabaja sobre el gráfico.
  const pincel = usePincel({
    codigos: datos.codigos,
    pacienteId,
    organizacionId: datos.organizacionId,
    onActivar: () => setVista('grafico'),
  })

  return (
    <>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm tabular-nums">
        <div className="flex gap-1.5">
          <dt className="font-medium">CPO-D {indices.cpod.total}</dt>
          <dd className="text-muted-foreground">
            C {indices.cpod.c} · P {indices.cpod.p} · O {indices.cpod.o}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-medium">ceo-d {indices.ceod.total}</dt>
          <dd className="text-muted-foreground">
            c {indices.ceod.c} · e {indices.ceod.e} · o {indices.ceod.o}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="grid grid-cols-2 gap-1" role="group" aria-label="Vista">
            {(
              [
                ['grafico', 'Gráfico'],
                ['tabla', 'Tabla'],
              ] as const
            ).map(([valor, texto]) => (
              <Button
                key={valor}
                variant={vista === valor ? 'default' : 'outline'}
                aria-pressed={vista === valor}
                onClick={() => setVista(valor)}
              >
                {texto}
              </Button>
            ))}
          </div>
          {!pasado && pincel.boton}
        </div>
        <p className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            {/* Con rayas, como en el gráfico: no se distingue solo por el color. */}
            <span
              aria-hidden="true"
              className="size-3 rounded-sm bg-[repeating-linear-gradient(45deg,var(--odontograma-rojo)_0_2px,var(--card)_2px_3px)]"
            />
            A tratar
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="bg-odontograma-azul size-3 rounded-sm" />
            Hecho o en buen estado
          </span>
        </p>
      </div>

      {fechas.length > 1 && <LineaDeTiempo fechas={fechas} dia={pasado} onCambiar={setDia} />}

      {!pasado && pincel.barra}

      {vista === 'grafico' ? (
        <Grafico
          porPieza={porPieza}
          rxPorPieza={rxPorPieza}
          codigos={codigos}
          onElegir={pasado ? undefined : (p) => (pincel.activo ? pincel.tocar(p) : abrir([p]))}
        />
      ) : (
        <Tabla
          porPieza={porPieza}
          rxPorPieza={rxPorPieza}
          codigos={codigos}
          onElegir={pasado ? undefined : (piezas) => abrir(piezas)}
        />
      )}

      {!pincel.activo && !pasado && (
        <p className="text-muted-foreground text-sm">
          Toca una pieza para ver lo registrado o agregar algo. Con el pincel, eliges qué marcar una
          vez y tocas varias piezas seguidas.
        </p>
      )}

      <PlanDeTratamiento
        pendientes={pendientes}
        codigos={codigos}
        dia={pasado}
        onTratar={pasado ? undefined : (r) => abrir([r.pieza], r.id)}
      />

      <SeccionExamenBucal
        pacienteId={pacienteId}
        organizacionId={datos.organizacionId}
        examenes={datos.examenes}
        dia={pasado}
      />

      <HojaPieza
        apertura={apertura}
        onCerrar={() => setApertura(null)}
        registros={datos.registros}
        rx={datos.rx}
        codigos={datos.codigos}
        pacienteId={pacienteId}
        organizacionId={datos.organizacionId}
      />
      {pincel.hoja}
    </>
  )
}

/** Hallazgos sin tratar, por pieza (0021). Sale de los registros: no se guarda aparte. */
function PlanDeTratamiento({
  pendientes,
  codigos,
  dia,
  onTratar,
}: {
  pendientes: RegistroOdontograma[]
  codigos: Map<string, Codigo>
  /** Un día anterior: lo que estaba pendiente entonces, sin botones. */
  dia: string | null
  onTratar?: (hallazgo: RegistroOdontograma) => void
}) {
  return (
    <section aria-labelledby="titulo-plan" className="flex flex-col gap-2">
      <h2 id="titulo-plan" className="text-lg font-medium">
        {dia ? `Pendiente al ${formatearFechaNumerica(dia)}` : 'Plan de tratamiento'}
      </h2>
      {pendientes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay hallazgos pendientes.</p>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border text-sm">
          {pendientes.map((r) => {
            const c = r.codigoId ? codigos.get(r.codigoId) : undefined
            if (!c) return null
            const texto = textoRegistro(r, c)
            return (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-7 font-medium tabular-nums">{r.pieza}</span>
                <p className="min-w-0 flex-1">
                  <span className="text-odontograma-rojo font-medium">{texto}</span> {c.nombre}
                  {r.nota && <span className="text-muted-foreground"> · {r.nota}</span>}
                </p>
                {onTratar && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Marcar ${texto} de la pieza ${r.pieza} como tratado`}
                    onClick={() => onTratar(r)}
                  >
                    <CheckIcon weight="bold" />
                    Tratar
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Ver la boca en un día con registros, del odontograma inicial a hoy. Un
 * control de rango nativo: funciona con el dedo, el mouse y las flechas.
 */
function LineaDeTiempo({
  fechas,
  dia,
  onCambiar,
}: {
  fechas: string[]
  /** El día elegido, o null si es hoy. */
  dia: string | null
  onCambiar: (dia: string | null) => void
}) {
  const indice = dia ? fechas.indexOf(dia) : fechas.length - 1
  const etiqueta = (i: number) => {
    const fecha = formatearFechaNumerica(fechas[i] ?? '')
    if (i === fechas.length - 1) return `Hoy (último registro, ${fecha})`
    return i === 0 ? `${fecha} (inicial)` : fecha
  }
  const id = useId()
  const elegir = (i: number) => onCambiar(i === fechas.length - 1 ? null : (fechas[i] ?? null))

  // El ancho decide cuántas fechas entran debajo sin pisarse.
  const [marcas, setMarcas] = useState<HTMLDivElement | null>(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    if (!marcas) return
    const observador = new ResizeObserver(([e]) => setAncho(e?.contentRect.width ?? 0))
    observador.observe(marcas)
    return () => observador.disconnect()
  }, [marcas])
  const visibles = fechasQueEntran(fechas.length, indice, ancho)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col text-sm font-medium">
        <span className="flex flex-wrap justify-between gap-2">
          <label htmlFor={id}>Ver la boca al</label>
          {/* El lector de pantalla lo lee en aria-valuetext. */}
          <span className="tabular-nums" aria-hidden="true">
            {etiqueta(indice)}
          </span>
        </span>
        <input
          id={id}
          type="range"
          min={0}
          max={fechas.length - 1}
          step={1}
          value={indice}
          aria-valuetext={etiqueta(indice)}
          onChange={(e) => elegir(Number(e.target.value))}
          className="linea-tiempo"
        />
        {/*
          Una marca por cada día con registros, alineada con su parada. Se
          puede tocar; con el teclado se usan las flechas del control.
        */}
        <div ref={setMarcas} aria-hidden="true" className="relative -mt-2 h-8 select-none">
          {fechas.map((fecha, i) => {
            const fraccion = fechas.length > 1 ? i / (fechas.length - 1) : 0
            const izquierda = `calc(${PULGAR / 2}px + (100% - ${PULGAR}px) * ${fraccion})`
            const elegida = i === indice
            return (
              <span
                key={fecha}
                onClick={() => elegir(i)}
                className="absolute top-0 flex h-8 w-6 -translate-x-1/2 cursor-pointer justify-center"
                style={{ left: izquierda }}
              >
                <span
                  className={cn(
                    'mt-0.5 h-2 w-0.5 rounded-full',
                    elegida ? 'bg-foreground' : 'bg-muted-foreground',
                  )}
                />
                {visibles.has(i) && (
                  <span
                    className={cn(
                      'absolute top-3 text-xs whitespace-nowrap tabular-nums',
                      i === 0
                        ? 'left-1/2 -ml-2.5'
                        : i === fechas.length - 1
                          ? 'right-1/2 -mr-2.5'
                          : '',
                      elegida
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground font-normal',
                    )}
                  >
                    {fechaCorta(fecha)}
                  </span>
                )}
              </span>
            )
          })}
        </div>
      </div>
      {dia && (
        <p className="bg-muted flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm">
          <span>
            Así estaba el {formatearFechaNumerica(dia)}. Solo para mirar: los cambios se hacen en el
            de hoy.
          </span>
          <Button variant="ghost" size="sm" onClick={() => onCambiar(null)}>
            Volver a hoy
          </Button>
        </p>
      )}
    </div>
  )
}

/** Ancho del pulgar del control, en px: el --pulgar de .linea-tiempo en globals.css. */
const PULGAR = 20
/** Lo que ocupa una fecha corta ("03/03/26") debajo del control, más el aire entre dos. */
const ANCHO_FECHA = 56
const AIRE = 8

/** "2026-03-03" → "03/03/26". */
const fechaCorta = (fecha: string) => {
  const [a, m, d] = fecha.split('-')
  return `${d}/${m}/${a?.slice(2)}`
}

/**
 * Qué fechas se escriben debajo del control sin pisarse: primero la elegida,
 * después la inicial y la última, y las demás mientras entren. Las que no
 * entran quedan como marca sola.
 */
function fechasQueEntran(cantidad: number, elegida: number, ancho: number): Set<number> {
  const centro = (i: number) =>
    PULGAR / 2 + (ancho - PULGAR) * (cantidad > 1 ? i / (cantidad - 1) : 0)
  // La primera y la última se alinean con el borde para no salirse.
  const tramo = (i: number): [number, number] =>
    i === 0
      ? [0, ANCHO_FECHA]
      : i === cantidad - 1
        ? [ancho - ANCHO_FECHA, ancho]
        : [centro(i) - ANCHO_FECHA / 2, centro(i) + ANCHO_FECHA / 2]
  const orden = [elegida, 0, cantidad - 1, ...Array.from({ length: cantidad }, (_, i) => i)]
  const elegidas: number[] = []
  for (const i of orden) {
    if (elegidas.includes(i)) continue
    const [desde, hasta] = tramo(i)
    const libre = elegidas.every((j) => {
      const [d, h] = tramo(j)
      return hasta + AIRE <= d || h + AIRE <= desde
    })
    if (libre) elegidas.push(i)
  }
  return new Set(elegidas)
}

/** "Rx del 03/03/2026" o "Rx del 03/03/2026 y del 10/03/2026". */
const textoRx = (rx: RadiografiaOdontograma[]) =>
  `Rx ${rx.map((r) => `del ${formatearFechaNumerica(r.fecha)}`).join(' y ')}`

/** "Pieza 36: C II-OM (caries), nota: sensibilidad, Rx del 03/03/2026" o "Pieza 36, sin registros". */
function descripcion(
  pieza: number,
  registros: RegistroOdontograma[],
  rx: RadiografiaOdontograma[],
  codigos: Map<string, Codigo>,
) {
  const textos = registros.flatMap((r) => {
    const c = r.codigoId ? codigos.get(r.codigoId) : undefined
    if (c) return [`${textoRegistro(r, c)} (${c.nombre.toLowerCase()})`]
    return r.nota ? [`nota: ${r.nota}`] : []
  })
  if (rx.length) textos.push(textoRx(rx))
  return textos.length ? `Pieza ${pieza}: ${textos.join(', ')}` : `Pieza ${pieza}, sin registros`
}

function Grafico({
  porPieza,
  rxPorPieza,
  codigos,
  onElegir,
}: {
  porPieza: Map<number, RegistroOdontograma[]>
  rxPorPieza: Map<number, RadiografiaOdontograma[]>
  codigos: Map<string, Codigo>
  onElegir?: (pieza: number) => void
}) {
  const fila = (lista: readonly number[], temporal: boolean) => {
    const mitades = [lista.slice(0, lista.length / 2), lista.slice(lista.length / 2)]
    return (
      <div className="grid grid-cols-2 gap-1.5">
        {mitades.map((mitad, i) => (
          <div
            key={i}
            className={cn(
              'grid grid-cols-8 gap-0.5',
              // Las temporales quedan pegadas a la línea media, debajo de sus permanentes.
              temporal && i === 0 && '[&>:first-child]:col-start-4',
            )}
          >
            {mitad.map((p) => (
              <BotonDiente
                key={p}
                pieza={p}
                registros={porPieza.get(p) ?? []}
                rx={rxPorPieza.get(p) ?? []}
                codigos={codigos}
                onElegir={onElegir}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      role="group"
      aria-label="Gráfico del odontograma"
      className="border-border bg-card -mx-2 flex flex-col gap-3 rounded-lg border px-1 py-3 md:mx-0 md:px-3"
    >
      {fila(ARCADAS.superiorPermanente, false)}
      {fila(ARCADAS.superiorTemporal, true)}
      <hr className="border-border" />
      {fila(ARCADAS.inferiorTemporal, true)}
      {fila(ARCADAS.inferiorPermanente, false)}
    </div>
  )
}

function BotonDiente({
  pieza,
  registros,
  rx,
  codigos,
  onElegir,
}: {
  pieza: number
  registros: RegistroOdontograma[]
  rx: RadiografiaOdontograma[]
  codigos: Map<string, Codigo>
  onElegir?: (pieza: number) => void
}) {
  const superior = esSuperior(pieza)
  // Los códigos que se dibujan como texto van escritos debajo o encima del diente.
  const textos = registros.flatMap((r) => {
    const c = r.codigoId ? codigos.get(r.codigoId) : undefined
    return c?.simbolo === 'texto' ? [{ id: r.id, texto: c.abreviatura, tipo: c.tipo }] : []
  })
  // Un punto gris avisa que la pieza tiene una nota.
  const tieneNota = registros.some((r) => r.codigoId === null)
  const numero = (
    <span className="text-muted-foreground text-[0.6875rem] tabular-nums">{pieza}</span>
  )
  const etiquetas = (
    <span className="flex min-h-3 flex-wrap justify-center text-[0.5625rem] leading-3 font-medium">
      {textos.map((t) => (
        <span key={t.id} className={COLOR_TEXTO[t.tipo]}>
          {t.texto}
        </span>
      ))}
      {tieneNota && <span className="text-muted-foreground">•</span>}
      {rx.length > 0 && <span className="text-muted-foreground">Rx</span>}
    </span>
  )
  return (
    <button
      type="button"
      onClick={() => onElegir?.(pieza)}
      disabled={!onElegir}
      aria-label={descripcion(pieza, registros, rx, codigos)}
      className="hover:bg-muted disabled:hover:bg-transparent focus-visible:ring-ring/40 flex min-w-0 flex-col items-center gap-0.5 rounded-sm py-0.5 outline-none focus-visible:ring-3"
    >
      {superior ? numero : etiquetas}
      <Diente pieza={pieza} registros={registros} codigos={codigos} className="w-full max-w-10" />
      {superior ? etiquetas : numero}
    </button>
  )
}

function Tabla({
  porPieza,
  rxPorPieza,
  codigos,
  onElegir,
}: {
  porPieza: Map<number, RegistroOdontograma[]>
  rxPorPieza: Map<number, RadiografiaOdontograma[]>
  codigos: Map<string, Codigo>
  onElegir?: (piezas: number[]) => void
}) {
  // Los textos de una columna (hallazgos o realizados) de las piezas de la fila.
  const columna = (piezas: number[], tipo: 'hallazgo' | 'realizado') =>
    piezas.flatMap((p) =>
      (porPieza.get(p) ?? []).flatMap((r) => {
        const c = r.codigoId ? codigos.get(r.codigoId) : undefined
        if (c?.tipo !== tipo) return []
        // En una fila con temporal, lo de la temporal lleva su número.
        const prefijo = piezas.length > 1 && p === piezas[1] ? `${p} ` : ''
        return [{ id: r.id, texto: prefijo + textoRegistro(r, c) }]
      }),
    )
  // Las notas solas van debajo, a lo ancho de las dos columnas.
  const notas = (piezas: number[]) =>
    piezas.flatMap((p) =>
      (porPieza.get(p) ?? []).flatMap((r) => {
        if (r.codigoId !== null || !r.nota) return []
        const prefijo = piezas.length > 1 && p === piezas[1] ? `${p}: ` : ''
        return [{ id: r.id, texto: prefijo + r.nota }]
      }),
    )

  return (
    <div className="border-border bg-card rounded-lg border text-sm">
      <div
        aria-hidden="true"
        className="border-border text-muted-foreground grid grid-cols-[4.5rem_1fr_1fr_2.5rem] gap-3 border-b px-3 py-2"
      >
        <span>Pieza</span>
        <span>A tratar</span>
        <span>Hecho</span>
        <span>Rx</span>
      </div>
      <ul className="divide-border divide-y">
        {FILAS_ODONTOGRAMA.map(({ permanente, temporal }) => {
          const piezas = temporal ? [permanente, temporal] : [permanente]
          const hallazgos = columna(piezas, 'hallazgo')
          const realizados = columna(piezas, 'realizado')
          const notasDeLaFila = notas(piezas)
          // Como en papel: un ✓ si se tomó la radiografía (0023).
          const conRx = piezas.filter((p) => rxPorPieza.has(p))
          return (
            <li key={permanente}>
              <button
                type="button"
                onClick={() => onElegir?.(piezas)}
                disabled={!onElegir}
                className="hover:bg-muted disabled:hover:bg-transparent focus-visible:ring-ring/40 grid min-h-11 w-full grid-cols-[4.5rem_1fr_1fr_2.5rem] items-center gap-3 px-3 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset"
              >
                <span className="tabular-nums">
                  <span className="font-medium">{permanente}</span>
                  {temporal && <span className="text-muted-foreground"> · {temporal}</span>}
                </span>
                <span className="text-odontograma-rojo flex flex-col">
                  <span className="sr-only">A tratar: </span>
                  {hallazgos.map((h) => (
                    <span key={h.id}>{h.texto}</span>
                  ))}
                </span>
                <span className="text-odontograma-azul flex flex-col">
                  <span className="sr-only">Hecho: </span>
                  {realizados.map((h) => (
                    <span key={h.id}>{h.texto}</span>
                  ))}
                </span>
                <span className="flex flex-col tabular-nums">
                  {conRx.map((p) => (
                    <span key={p} className="flex items-center gap-0.5">
                      {/* En una fila con temporal, la de la temporal lleva su número. */}
                      {piezas.length > 1 && p === piezas[1] && (
                        <span className="text-muted-foreground text-xs">{p}</span>
                      )}
                      <CheckIcon weight="bold" aria-hidden="true" className="size-4" />
                      <span className="sr-only">
                        {textoRx(rxPorPieza.get(p) ?? [])}
                        {piezas.length > 1 && ` (pieza ${p})`}
                      </span>
                    </span>
                  ))}
                </span>
                {notasDeLaFila.length > 0 && (
                  <span className="text-muted-foreground col-span-3 col-start-2 flex flex-col">
                    {notasDeLaFila.map((n) => (
                      <span key={n.id}>Nota: {n.texto}</span>
                    ))}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

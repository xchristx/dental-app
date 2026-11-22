import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { CaretLeftIcon, CheckIcon } from '@phosphor-icons/react'
import {
  ARCADAS,
  FILAS_ODONTOGRAMA,
  calcularIndices,
  esSuperior,
  estadoOdontograma,
  textoRegistro,
  type RegistroOdontograma,
} from '@dental/core'
import { Diente } from '@/components/odontograma/diente'
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
  // Los hallazgos ya tratados no se dibujan ni cuentan: queda lo realizado (0021).
  const { vigentes, pendientes } = estadoOdontograma(datos.registros, datos.codigos)
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
          {pincel.boton}
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

      {pincel.barra}

      {vista === 'grafico' ? (
        <Grafico
          porPieza={porPieza}
          codigos={codigos}
          onElegir={(p) => (pincel.activo ? pincel.tocar(p) : abrir([p]))}
        />
      ) : (
        <Tabla porPieza={porPieza} codigos={codigos} onElegir={(piezas) => abrir(piezas)} />
      )}

      {!pincel.activo && (
        <p className="text-muted-foreground text-sm">
          Toca una pieza para ver lo registrado o agregar algo. Con el pincel, eliges qué marcar una
          vez y tocas varias piezas seguidas.
        </p>
      )}

      <PlanDeTratamiento
        pendientes={pendientes}
        codigos={codigos}
        onTratar={(r) => abrir([r.pieza], r.id)}
      />

      <HojaPieza
        apertura={apertura}
        onCerrar={() => setApertura(null)}
        registros={datos.registros}
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
  onTratar,
}: {
  pendientes: RegistroOdontograma[]
  codigos: Map<string, Codigo>
  onTratar: (hallazgo: RegistroOdontograma) => void
}) {
  return (
    <section aria-labelledby="titulo-plan" className="flex flex-col gap-2">
      <h2 id="titulo-plan" className="text-lg font-medium">
        Plan de tratamiento
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
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Marcar ${texto} de la pieza ${r.pieza} como tratado`}
                  onClick={() => onTratar(r)}
                >
                  <CheckIcon weight="bold" />
                  Tratar
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** "Pieza 36: C II-OM (caries), nota: sensibilidad" o "Pieza 36, sin registros". */
function descripcion(
  pieza: number,
  registros: RegistroOdontograma[],
  codigos: Map<string, Codigo>,
) {
  const textos = registros.flatMap((r) => {
    const c = r.codigoId ? codigos.get(r.codigoId) : undefined
    if (c) return [`${textoRegistro(r, c)} (${c.nombre.toLowerCase()})`]
    return r.nota ? [`nota: ${r.nota}`] : []
  })
  return textos.length ? `Pieza ${pieza}: ${textos.join(', ')}` : `Pieza ${pieza}, sin registros`
}

function Grafico({
  porPieza,
  codigos,
  onElegir,
}: {
  porPieza: Map<number, RegistroOdontograma[]>
  codigos: Map<string, Codigo>
  onElegir: (pieza: number) => void
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
  codigos,
  onElegir,
}: {
  pieza: number
  registros: RegistroOdontograma[]
  codigos: Map<string, Codigo>
  onElegir: (pieza: number) => void
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
    </span>
  )
  return (
    <button
      type="button"
      onClick={() => onElegir(pieza)}
      aria-label={descripcion(pieza, registros, codigos)}
      className="hover:bg-muted focus-visible:ring-ring/40 flex min-w-0 flex-col items-center gap-0.5 rounded-sm py-0.5 outline-none focus-visible:ring-3"
    >
      {superior ? numero : etiquetas}
      <Diente pieza={pieza} registros={registros} codigos={codigos} className="w-full max-w-10" />
      {superior ? etiquetas : numero}
    </button>
  )
}

function Tabla({
  porPieza,
  codigos,
  onElegir,
}: {
  porPieza: Map<number, RegistroOdontograma[]>
  codigos: Map<string, Codigo>
  onElegir: (piezas: number[]) => void
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
        className="border-border text-muted-foreground grid grid-cols-[4.5rem_1fr_1fr] gap-3 border-b px-3 py-2"
      >
        <span>Pieza</span>
        <span>A tratar</span>
        <span>Hecho</span>
      </div>
      <ul className="divide-border divide-y">
        {FILAS_ODONTOGRAMA.map(({ permanente, temporal }) => {
          const piezas = temporal ? [permanente, temporal] : [permanente]
          const hallazgos = columna(piezas, 'hallazgo')
          const realizados = columna(piezas, 'realizado')
          const notasDeLaFila = notas(piezas)
          return (
            <li key={permanente}>
              <button
                type="button"
                onClick={() => onElegir(piezas)}
                className="hover:bg-muted focus-visible:ring-ring/40 grid min-h-11 w-full grid-cols-[4.5rem_1fr_1fr] items-center gap-3 px-3 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-inset"
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
                {notasDeLaFila.length > 0 && (
                  <span className="text-muted-foreground col-span-2 col-start-2 flex flex-col">
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

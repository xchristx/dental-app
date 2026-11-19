import { CalendarPlusIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr'
import { calcularLlegada, formatearLlegada } from '@dental/core'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Página provisoria: muestra la disposición de la agenda en celular (día)
// y desde tablet (semana), según docs/diseno.md y la decisión 0009.
// Datos inventados. La agenda real, con línea de tiempo y huecos libres,
// llega con el MVP 1.

const ZONA = 'America/La_Paz'

const formatoHora = new Intl.DateTimeFormat('es-BO', {
  timeZone: ZONA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// "2026-11-24": sirve para agrupar las citas por día en la zona de La Paz.
const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const lugares = {
  consultorio: { nombre: 'Consultorio', color: 'azul' },
  clinica: { nombre: 'Clínica', color: 'verde' },
} as const

// Clases completas para que Tailwind las encuentre.
const estiloLugar = {
  azul: { bloque: 'bg-lugar-azul border-l-lugar-azul-fg', texto: 'text-lugar-azul-fg' },
  verde: { bloque: 'bg-lugar-verde border-l-lugar-verde-fg', texto: 'text-lugar-verde-fg' },
} as const

type Estado = 'agendada' | 'confirmada' | 'atendida'

interface CitaDemo {
  id: string
  paciente: string
  tipo: string
  lugar: keyof typeof lugares
  inicio: Date
  fin: Date
  estado: Estado
  llegada?: Date
}

// Horas en UTC: La Paz es UTC-4, así que 14:00Z son las 10:00 allá.
const citas: CitaDemo[] = [
  {
    id: 'c1',
    paciente: 'Camila Vargas',
    tipo: 'Control',
    lugar: 'clinica',
    inicio: new Date('2026-11-23T14:00:00Z'),
    fin: new Date('2026-11-23T15:00:00Z'),
    estado: 'atendida',
    llegada: new Date('2026-11-23T13:58:00Z'),
  },
  {
    id: 'c2',
    paciente: 'Martín Salazar',
    tipo: 'Endodoncia',
    lugar: 'consultorio',
    inicio: new Date('2026-11-23T20:00:00Z'),
    fin: new Date('2026-11-23T21:00:00Z'),
    estado: 'atendida',
    llegada: new Date('2026-11-23T20:40:00Z'),
  },
  {
    id: 'c3',
    paciente: 'Lucía Fernández',
    tipo: 'Control',
    lugar: 'consultorio',
    inicio: new Date('2026-11-24T14:00:00Z'),
    fin: new Date('2026-11-24T15:00:00Z'),
    estado: 'atendida',
    llegada: new Date('2026-11-24T14:25:00Z'),
  },
  {
    id: 'c4',
    paciente: 'Jorge Mamani',
    tipo: 'Retiro de puntos',
    lugar: 'consultorio',
    inicio: new Date('2026-11-24T15:15:00Z'),
    fin: new Date('2026-11-24T15:30:00Z'),
    estado: 'confirmada',
  },
  {
    id: 'c5',
    paciente: 'Valeria Gutiérrez',
    tipo: 'Cirugía',
    lugar: 'clinica',
    inicio: new Date('2026-11-24T19:00:00Z'),
    fin: new Date('2026-11-24T21:00:00Z'),
    estado: 'agendada',
  },
  {
    id: 'c6',
    paciente: 'Diego Torrez',
    tipo: 'Endodoncia',
    lugar: 'consultorio',
    inicio: new Date('2026-11-24T22:00:00Z'),
    fin: new Date('2026-11-24T23:00:00Z'),
    estado: 'agendada',
  },
  {
    id: 'c7',
    paciente: 'Sofía Céspedes',
    tipo: 'Control',
    lugar: 'consultorio',
    inicio: new Date('2026-11-25T14:00:00Z'),
    fin: new Date('2026-11-25T15:00:00Z'),
    estado: 'confirmada',
  },
  {
    id: 'c8',
    paciente: 'Andrés Quiroga',
    tipo: 'Cirugía',
    lugar: 'clinica',
    inicio: new Date('2026-11-25T18:00:00Z'),
    fin: new Date('2026-11-25T19:30:00Z'),
    estado: 'agendada',
  },
  {
    id: 'c9',
    paciente: 'Paola Arce',
    tipo: 'Control',
    lugar: 'consultorio',
    inicio: new Date('2026-11-26T21:00:00Z'),
    fin: new Date('2026-11-26T22:00:00Z'),
    estado: 'agendada',
  },
  {
    id: 'c10',
    paciente: 'Gabriel Ortiz',
    tipo: 'Endodoncia',
    lugar: 'clinica',
    inicio: new Date('2026-11-27T15:00:00Z'),
    fin: new Date('2026-11-27T16:00:00Z'),
    estado: 'agendada',
  },
]

// En la demo, "hoy" es el martes 24.
const HOY = '2026-11-24'

const semana = [
  { fecha: '2026-11-23', nombre: 'Lun', numero: 23 },
  { fecha: '2026-11-24', nombre: 'Mar', numero: 24 },
  { fecha: '2026-11-25', nombre: 'Mié', numero: 25 },
  { fecha: '2026-11-26', nombre: 'Jue', numero: 26 },
  { fecha: '2026-11-27', nombre: 'Vie', numero: 27 },
  { fecha: '2026-11-28', nombre: 'Sáb', numero: 28 },
  { fecha: '2026-11-29', nombre: 'Dom', numero: 29 },
]

function citasDelDia(fecha: string) {
  return citas
    .filter((cita) => formatoFecha.format(cita.inicio) === fecha)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
}

function BadgeEstado({ estado }: { estado: Estado }) {
  // `atendida` no lleva badge: se muestra la hora de llegada.
  if (estado === 'atendida') return null
  return (
    <span
      className={cn(
        'rounded-full px-1.5 py-0.5 text-xs font-medium',
        estado === 'confirmada'
          ? 'bg-lugar-verde text-lugar-verde-fg'
          : 'bg-card text-muted-foreground',
      )}
    >
      {estado === 'confirmada' ? 'Confirmada' : 'Agendada'}
    </span>
  )
}

function BloqueCita({ cita }: { cita: CitaDemo }) {
  const lugar = lugares[cita.lugar]
  const estilo = estiloLugar[lugar.color]

  return (
    <article className={cn('rounded-lg border-l-[3px] p-3 md:p-2 xl:p-3', estilo.bloque)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-muted-foreground text-sm tabular-nums">
          {formatoHora.format(cita.inicio)} – {formatoHora.format(cita.fin)}
        </p>
        <BadgeEstado estado={cita.estado} />
      </div>
      <p className="mt-1 leading-snug font-medium">{cita.paciente}</p>
      <p className={cn('text-sm', estilo.texto)}>
        {cita.tipo} · {lugar.nombre}
      </p>
      {cita.llegada && (
        <p className="text-muted-foreground mt-1 text-sm">
          {formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))}
        </p>
      )}
    </article>
  )
}

export default function AgendaPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-3xl leading-[1.1] tracking-[-0.02em]">
          <span className="md:hidden">Martes 24 de noviembre</span>
          <span className="hidden md:inline">23 – 29 de noviembre</span>
        </h1>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Anterior">
            <CaretLeftIcon weight="bold" />
          </Button>
          <Button variant="outline">Hoy</Button>
          <Button variant="outline" size="icon" aria-label="Siguiente">
            <CaretRightIcon weight="bold" />
          </Button>
          <Button className="ml-2 hidden md:inline-flex">
            <CalendarPlusIcon weight="bold" />
            Agendar
          </Button>
        </div>
      </header>

      {/* Celular: vista de día */}
      <ol className="flex flex-col gap-3 md:hidden">
        {citasDelDia(HOY).map((cita) => (
          <li key={cita.id}>
            <BloqueCita cita={cita} />
          </li>
        ))}
      </ol>

      {/* Tablet y escritorio: vista de semana */}
      <div className="hidden flex-1 grid-cols-7 gap-2 md:grid xl:gap-3">
        {semana.map((dia) => {
          const esHoy = dia.fecha === HOY
          const delDia = citasDelDia(dia.fecha)
          return (
            <section key={dia.fecha} aria-label={`${dia.nombre} ${dia.numero}`} className="min-w-0">
              <h2
                className={cn(
                  'border-border mb-3 flex items-baseline gap-1.5 border-b pb-2 text-sm',
                  esHoy ? 'text-foreground font-medium' : 'text-muted-foreground',
                )}
              >
                {dia.nombre}
                <span
                  className={cn(
                    'tabular-nums',
                    esHoy && 'bg-primary text-primary-foreground rounded-full px-1.5',
                  )}
                >
                  {dia.numero}
                </span>
              </h2>
              {delDia.length > 0 ? (
                <ol className="flex flex-col gap-2">
                  {delDia.map((cita) => (
                    <li key={cita.id}>
                      <BloqueCita cita={cita} />
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted-foreground text-sm">Sin citas</p>
              )}
            </section>
          )
        })}
      </div>

      {/* Celular: "Agendar" fijo abajo, encima de la barra de navegación */}
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:hidden">
        <Button size="lg" className="w-full">
          <CalendarPlusIcon weight="bold" />
          Agendar
        </Button>
      </div>
    </main>
  )
}

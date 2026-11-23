import { CalendarDotsIcon, ReceiptIcon, ToothIcon } from '@phosphor-icons/react'
import { BloqueCita } from '@/components/agenda/bloque-cita'
import type { CitaAgenda } from '@/lib/agenda/datos'

// Citas inventadas, solo para mostrar cómo se ve la agenda antes de entrar.
// Usan el mismo componente que la agenda real, así la muestra nunca queda vieja.
function cita(
  id: string,
  desde: string,
  hasta: string,
  datos: Pick<CitaAgenda, 'estado' | 'paciente' | 'tipo' | 'lugar'> & Partial<CitaAgenda>,
): CitaAgenda {
  return {
    id,
    inicio: new Date(`2026-11-24T${desde}:00-04:00`),
    fin: new Date(`2026-11-24T${hasta}:00-04:00`),
    finPrevisto: null,
    llegada: null,
    profesionalId: 'muestra',
    lugarId: 'muestra',
    tipoCitaId: null,
    reagendadaDesde: null,
    pacienteId: null,
    telefono: null,
    nota: null,
    profesional: 'Dra. Muestra',
    especialidad: null,
    otraProfesional: null,
    recordatorioEnviado: null,
    ...datos,
  }
}

const CITAS: CitaAgenda[] = [
  cita('m1', '10:00', '10:45', {
    estado: 'atendida',
    llegada: new Date('2026-11-24T10:05:00-04:00'),
    paciente: 'Carla Rojas',
    tipo: 'Control',
    lugar: { nombre: 'Consultorio', color: 'azul' },
  }),
  cita('m2', '11:00', '12:00', {
    estado: 'confirmada',
    paciente: 'Daniel Choque',
    tipo: 'Endodoncia',
    lugar: { nombre: 'Consultorio', color: 'azul' },
  }),
  cita('m3', '15:30', '16:30', {
    estado: 'agendada',
    paciente: 'Rosa Limachi',
    tipo: 'Cirugía',
    lugar: { nombre: 'Clínica', color: 'verde' },
  }),
]

const PUNTOS = [
  { Icono: CalendarDotsIcon, texto: 'Citas en varios lugares, sin choques de horario.' },
  { Icono: ToothIcon, texto: 'Historia clínica con odontograma y radiografías.' },
  { Icono: ReceiptIcon, texto: 'Presupuestos y pagos en cuotas, con recibo por WhatsApp.' },
] as const

/** Columna de presentación de la pantalla de entrada (solo en escritorio). */
export function MuestraAgenda() {
  return (
    <aside
      aria-label="Qué hace Sifel"
      className="border-border bg-card hidden flex-col lg:order-first justify-center gap-10 border-r px-12 py-12 lg:flex xl:px-20"
    >
      <div className="flex max-w-md flex-col gap-6">
        <h2 className="titulo-pagina text-4xl">
          La agenda del consultorio, la ficha y los pagos, en un solo lugar.
        </h2>
        <ul className="flex flex-col gap-3">
          {PUNTOS.map(({ Icono, texto }) => (
            <li key={texto} className="text-muted-foreground flex items-start gap-3">
              <Icono weight="bold" className="text-foreground mt-0.5 size-5 shrink-0" />
              {texto}
            </li>
          ))}
        </ul>
      </div>

      {/* Un día de muestra: decorativo, los lectores de pantalla ya tienen la lista de arriba. */}
      <div
        aria-hidden="true"
        className="border-border bg-background flex max-w-md flex-col gap-3 rounded-xl border p-4"
      >
        <p className="font-heading text-xl leading-[1.1] tracking-[-0.02em]">
          Martes 24 de noviembre
        </p>
        <ol className="flex flex-col gap-2">
          {CITAS.map((c) => (
            <li key={c.id}>
              <BloqueCita cita={c} />
            </li>
          ))}
        </ol>
      </div>
    </aside>
  )
}

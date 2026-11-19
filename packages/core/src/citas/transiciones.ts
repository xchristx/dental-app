import { fechaEnZona } from '../fechas/fechas'
import type { EstadoCita } from './estados'

/** Cuándo es la cita respecto de ahora. Las reglas de tiempo son de la 0013. */
export interface MomentoCita {
  inicio: Date
  ahora: Date
  zona: string
}

/**
 * A qué estados puede pasar una cita desde el estado actual (0005), según la
 * hora (0013). Se usa en la interfaz para mostrar los botones y en el servidor
 * para validar.
 *
 * - agendada → confirmada, atendida ("Llegó"), no_asistio, cancelada
 * - confirmada → atendida, no_asistio, cancelada, o volver a agendada
 * - atendida, no_asistio o cancelada → volver a agendada (deshacer un error)
 *
 * Y según la hora:
 * - "Confirmó" solo antes de que empiece.
 * - "Llegó" desde el mismo día: hay pacientes que llegan mucho antes.
 * - "No asistió" solo desde la hora de la cita.
 * - Cancelar y deshacer, siempre: puede que se anote después.
 *
 * Un bloqueo (sin paciente) solo usa agendada y cancelada.
 */
export function estadosSiguientes(
  estado: EstadoCita,
  esBloqueo: boolean,
  momento: MomentoCita,
): EstadoCita[] {
  if (esBloqueo) {
    if (estado === 'agendada') return ['cancelada']
    if (estado === 'cancelada') return ['agendada']
    return []
  }
  const posibles: EstadoCita[] =
    estado === 'agendada'
      ? ['confirmada', 'atendida', 'no_asistio', 'cancelada']
      : estado === 'confirmada'
        ? ['agendada', 'atendida', 'no_asistio', 'cancelada']
        : ['agendada']
  return posibles.filter((e) => permitidoAhora(e, momento))
}

function permitidoAhora(estado: EstadoCita, momento: MomentoCita): boolean {
  return motivoPorHora(estado, momento) === null
}

/**
 * Por qué no se puede pasar a ese estado a esta hora, o null si se puede.
 * El servidor lo usa para explicar el rechazo.
 */
export function motivoPorHora(
  hacia: EstadoCita,
  { inicio, ahora, zona }: MomentoCita,
): string | null {
  switch (hacia) {
    case 'confirmada':
      return ahora < inicio ? null : 'La cita ya empezó: ya no hace falta confirmarla.'
    case 'atendida':
      return fechaEnZona(ahora, zona) >= fechaEnZona(inicio, zona)
        ? null
        : 'Todavía no es el día de la cita.'
    case 'no_asistio':
      return ahora >= inicio ? null : 'La cita todavía no empieza.'
    default:
      return null
  }
}

export function puedeCambiarA(
  desde: EstadoCita,
  hacia: EstadoCita,
  esBloqueo: boolean,
  momento: MomentoCita,
): boolean {
  return estadosSiguientes(desde, esBloqueo, momento).includes(hacia)
}

/** El recordatorio tiene sentido mientras la cita está activa y no empezó. */
export function puedeEnviarRecordatorio(estado: EstadoCita, inicio: Date, ahora: Date): boolean {
  return (estado === 'agendada' || estado === 'confirmada') && ahora < inicio
}

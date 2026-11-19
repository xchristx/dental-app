import type { EstadoCita } from './estados'

/**
 * A qué estados puede pasar una cita desde el estado actual (decisión 0005).
 * Se usa en la interfaz para mostrar los botones y en el servidor para validar.
 *
 * - agendada → confirmada, atendida ("Llegó"), no_asistio, cancelada
 * - confirmada → atendida, no_asistio, cancelada, o volver a agendada
 * - atendida, no_asistio o cancelada → volver a agendada (deshacer un error)
 *
 * Un bloqueo (sin paciente) solo usa agendada y cancelada.
 */
export function estadosSiguientes(estado: EstadoCita, esBloqueo: boolean): EstadoCita[] {
  if (esBloqueo) {
    if (estado === 'agendada') return ['cancelada']
    if (estado === 'cancelada') return ['agendada']
    return []
  }
  switch (estado) {
    case 'agendada':
      return ['confirmada', 'atendida', 'no_asistio', 'cancelada']
    case 'confirmada':
      return ['agendada', 'atendida', 'no_asistio', 'cancelada']
    case 'atendida':
    case 'no_asistio':
    case 'cancelada':
      return ['agendada']
  }
}

export function puedeCambiarA(desde: EstadoCita, hacia: EstadoCita, esBloqueo: boolean): boolean {
  return estadosSiguientes(desde, esBloqueo).includes(hacia)
}

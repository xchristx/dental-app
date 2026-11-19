import { z } from 'zod'
import type { EstadoCita } from './estados'
import { NuevaCita } from './nueva-cita'

/**
 * Reagendar (decisiones 0005 y 0012): la cita original no se mueve. Queda
 * cancelada o como "no asistió", y se crea una cita nueva que apunta a ella.
 */

/**
 * Si una cita se puede reagendar. Una atendida no (ya pasó) y un bloqueo
 * tampoco: se cancela y se crea otro. Una cita ya reagendada tampoco: se
 * reagenda la nueva.
 */
export function puedeReagendar(
  cita: { estado: EstadoCita; esBloqueo: boolean },
  yaReagendada: boolean,
): boolean {
  return !cita.esBloqueo && cita.estado !== 'atendida' && !yaReagendada
}

/**
 * Cómo queda la cita original. Si ya se había marcado cancelada o "no asistió",
 * queda igual. Si seguía activa, depende de si su hora ya pasó: si pasó, el
 * paciente no vino; si no, la cita se canceló antes.
 */
export function estadoAlReagendar(
  cita: { estado: EstadoCita; inicio: Date },
  ahora: Date,
): 'cancelada' | 'no_asistio' {
  if (cita.estado === 'cancelada' || cita.estado === 'no_asistio') return cita.estado
  return cita.inicio.getTime() <= ahora.getTime() ? 'no_asistio' : 'cancelada'
}

/**
 * Datos para reagendar. Son los de una cita nueva menos el paciente, que es
 * el mismo de la original.
 */
export const ReagendarCita = NuevaCita.omit({ paciente: true }).extend({
  citaOriginalId: z.uuid(),
})
export type ReagendarCita = z.infer<typeof ReagendarCita>

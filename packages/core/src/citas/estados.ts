import { z } from 'zod'

/** Estados de una cita. Ver docs/decisiones/0005-estados-de-cita.md */
export const EstadoCita = z.enum(['agendada', 'confirmada', 'atendida', 'no_asistio', 'cancelada'])
export type EstadoCita = z.infer<typeof EstadoCita>

/**
 * Estados que ocupan la agenda y cuentan para los choques.
 * `cancelada` y `no_asistio` liberan el espacio.
 * Debe coincidir con la condición de las restricciones de exclusión en Postgres.
 */
export const ESTADOS_QUE_OCUPAN = [
  'agendada',
  'confirmada',
  'atendida',
] as const satisfies readonly EstadoCita[]

export function ocupaAgenda(estado: EstadoCita): boolean {
  return (ESTADOS_QUE_OCUPAN as readonly EstadoCita[]).includes(estado)
}

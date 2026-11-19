import { z } from 'zod'

/** Datos de una profesional que se editan en Ajustes (0014). */
export const DatosProfesional = z.object({
  id: z.uuid(),
  nombre: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre de la profesional.')
    .max(80, 'Máximo 80 caracteres.'),
  especialidad: z
    .string()
    .trim()
    .max(60, 'Máximo 60 caracteres.')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})
export type DatosProfesional = z.infer<typeof DatosProfesional>

/** "Dra. Rocío Paz · Ortodoncia", o solo el nombre si no tiene especialidad. */
export function nombreConEspecialidad(p: { nombre: string; especialidad: string | null }): string {
  return p.especialidad ? `${p.nombre} · ${p.especialidad}` : p.nombre
}

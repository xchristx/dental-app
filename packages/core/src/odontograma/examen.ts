import { z } from 'zod'
import type { Fecha } from '../fechas/fechas'

// Examen bucal (decisión 0024): los datos generales de la hoja del
// odontograma. En las preguntas, null es "sin dato".

export const PREGUNTAS_EXAMEN = [
  { campo: 'usaMondadientes', texto: '¿Usa mondadientes?' },
  { campo: 'cepillaLengua', texto: '¿Se cepilla la lengua?' },
  { campo: 'tartaro', texto: 'Tártaro' },
  { campo: 'halitosis', texto: 'Halitosis' },
  { campo: 'placaBacteriana', texto: 'Placa bacteriana' },
  { campo: 'materiaAlba', texto: 'Materia alba' },
] as const
export type PreguntaExamen = (typeof PREGUNTAS_EXAMEN)[number]['campo']

const respuesta = z.boolean().nullable()
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()

/** Una versión nueva del examen bucal. */
export const DatosExamenBucal = z.object({
  id: z.uuid(),
  pacienteId: z.uuid(),
  usaMondadientes: respuesta,
  cepillaLengua: respuesta,
  tartaro: respuesta,
  halitosis: respuesta,
  placaBacteriana: respuesta,
  materiaAlba: respuesta,
  oclusion: textoOpcional(200),
  observaciones: textoOpcional(2000),
})
export type DatosExamenBucal = z.infer<typeof DatosExamenBucal>

/** "Sí", "No" o "Sin dato". */
export const textoRespuesta = (valor: boolean | null) =>
  valor === null ? 'Sin dato' : valor ? 'Sí' : 'No'

/**
 * La versión vigente un día: la última guardada ese día o antes. `versiones`
 * va de la más nueva a la más vieja, con el día (en La Paz) en que se guardó.
 */
export function examenAlDia<E extends { fecha: Fecha }>(versiones: E[], fecha: Fecha): E | null {
  return versiones.find((v) => v.fecha <= fecha) ?? null
}

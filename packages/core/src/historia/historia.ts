import { z } from 'zod'
import { ZONA_LA_PAZ, esFechaValida, fechaEnZona, type Fecha } from '../fechas/fechas'

// Historia clínica, primera parte (decisión 0018). Las mismas reglas las
// aplica Postgres; aquí sirven para avisar antes de guardar.

const MAXIMO_TEXTO = 4000

const textoOpcional = z
  .string()
  .trim()
  .max(MAXIMO_TEXTO, `Máximo ${MAXIMO_TEXTO} caracteres.`)
  .transform((v) => (v === '' ? null : v))
  .nullable()

/** Anamnesis en texto libre. Cada vez que se guarda es una versión nueva. */
export const DatosAnamnesis = z
  .object({
    id: z.uuid(),
    pacienteId: z.uuid(),
    antecedentesPersonales: textoOpcional,
    antecedentesFamiliares: textoOpcional,
    alergias: textoOpcional,
    sinAlergias: z.boolean(),
    medicamentos: textoOpcional,
  })
  .refine((a) => !(a.sinAlergias && a.alergias !== null), {
    message: 'Si tiene alergias, desmarca "Sin alergias conocidas".',
    path: ['sinAlergias'],
  })
export type DatosAnamnesis = z.infer<typeof DatosAnamnesis>

/** Una entrada de la evolución: qué se hizo y cuándo. */
export const DatosEvolucion = z.object({
  id: z.uuid(),
  pacienteId: z.uuid(),
  citaId: z.uuid().nullable(),
  fecha: z
    .string()
    .refine(esFechaValida, 'Elige una fecha válida.')
    .refine((v) => v <= fechaEnZona(new Date(), ZONA_LA_PAZ), 'La fecha no puede ser futura.'),
  texto: z
    .string()
    .trim()
    .min(1, 'Escribe qué se hizo.')
    .max(MAXIMO_TEXTO, `Máximo ${MAXIMO_TEXTO} caracteres.`),
})
export type DatosEvolucion = z.infer<typeof DatosEvolucion>

/** Lo que hay que saber de las alergias antes de atender. */
export type ResumenAlergias =
  { tipo: 'alergias'; texto: string } | { tipo: 'sin_alergias' } | { tipo: 'sin_dato' }

export function resumenAlergias(
  anamnesis: { alergias: string | null; sinAlergias: boolean } | null,
): ResumenAlergias {
  if (anamnesis?.alergias) return { tipo: 'alergias', texto: anamnesis.alergias }
  if (anamnesis?.sinAlergias) return { tipo: 'sin_alergias' }
  return { tipo: 'sin_dato' }
}

/**
 * Si quien mira puede corregir o borrar una evolución: solo quien la escribió
 * y solo el mismo día en que la escribió, en La Paz (0018).
 */
export function evolucionEditable(
  evolucion: { autorId: string | null; creadaEn: Date },
  usuarioId: string | null,
  ahora: Date,
): boolean {
  if (!usuarioId || evolucion.autorId !== usuarioId) return false
  return fechaEnZona(evolucion.creadaEn, ZONA_LA_PAZ) === fechaEnZona(ahora, ZONA_LA_PAZ)
}

/** "22/11/2026": para fechas que pueden ser de otro año. */
export function formatearFechaNumerica(fecha: Fecha): string {
  return fecha.split('-').reverse().join('/')
}

/** Derivación recibida ("Derivado por") o enviada ("Derivado a") (0019). */
export const DatosDerivacion = z
  .object({
    id: z.uuid(),
    pacienteId: z.uuid(),
    sentido: z.enum(['recibida', 'enviada']),
    profesionalId: z.uuid().nullable(),
    contacto: z
      .string()
      .trim()
      .max(200, 'Máximo 200 caracteres.')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    motivo: z
      .string()
      .trim()
      .max(2000, 'Máximo 2000 caracteres.')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    fecha: z
      .string()
      .refine(esFechaValida, 'Elige una fecha válida.')
      .refine((v) => v <= fechaEnZona(new Date(), ZONA_LA_PAZ), 'La fecha no puede ser futura.'),
  })
  .refine((d) => d.profesionalId !== null || d.contacto !== null, {
    message: 'Elige una profesional o escribe a quién.',
    path: ['contacto'],
  })
  // Con profesional, el nombre de afuera sobra.
  .transform((d) => (d.profesionalId ? { ...d, contacto: null } : d))
export type DatosDerivacion = z.infer<typeof DatosDerivacion>

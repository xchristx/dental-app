import { z } from 'zod'
import { calcularLlegada, formatearDuracion, type Llegada } from '../citas/llegada'
import { telefonoParaWhatsApp } from '../citas/recordatorio'
import { ZONA_LA_PAZ, esFechaValida, fechaEnZona, type Fecha } from '../fechas/fechas'

/** Ficha básica del paciente (MVP 1): nombre, celular y fecha de nacimiento. */
export const DatosPaciente = z.object({
  id: z.uuid(),
  nombre: z
    .string()
    .trim()
    .min(2, 'Escribe el nombre del paciente.')
    .max(120, 'Máximo 120 caracteres.'),
  telefono: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .refine(
      (v) => v === null || telefonoParaWhatsApp(v) !== null,
      'Ese número no parece un celular. Escríbelo con 8 dígitos, por ejemplo 71234567.',
    ),
  fechaNacimiento: z
    .string()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .refine((v) => v === null || esFechaValida(v), 'Elige una fecha válida.')
    // Se compara con hoy en La Paz (0013).
    .refine(
      (v) => v === null || v <= fechaEnZona(new Date(), ZONA_LA_PAZ),
      'La fecha de nacimiento no puede ser futura.',
    ),
})
export type DatosPaciente = z.infer<typeof DatosPaciente>

/** Años cumplidos a una fecha. null si no hay fecha de nacimiento o es futura. */
export function edad(fechaNacimiento: Fecha | null, hoy: Fecha): number | null {
  if (!fechaNacimiento || fechaNacimiento > hoy) return null
  const [an, mn, dn] = fechaNacimiento.split('-').map(Number) as [number, number, number]
  const [ah, mh, dh] = hoy.split('-').map(Number) as [number, number, number]
  const cumplioEsteAnio = mh > mn || (mh === mn && dh >= dn)
  return ah - an - (cumplioEsteAnio ? 0 : 1)
}

/** Para buscar sin importar tildes ni mayúsculas: "lucia" encuentra a "Lucía". */
export function normalizarBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

/** Si el nombre contiene todas las palabras buscadas: "ana per" encuentra a "Ana Pérez". */
export function coincideBusqueda(nombre: string, busqueda: string): boolean {
  const palabras = normalizarBusqueda(busqueda).split(/\s+/).filter(Boolean)
  const n = normalizarBusqueda(nombre)
  return palabras.every((p) => n.includes(p))
}

/** Mínimo de citas con hora de llegada para decir "suele llegar…". */
export const MINIMO_PARA_PUNTUALIDAD = 3

/**
 * Cómo suele llegar el paciente (0005), a partir de sus citas atendidas con
 * hora de llegada. Usa la mediana para que una sola vez muy tarde no pese
 * demasiado. null si hay pocas citas para decir algo.
 */
export function puntualidad(
  citas: { inicio: Date; llegada: Date | null }[],
): { llegada: Llegada; citas: number } | null {
  const diferencias = citas
    .filter((c): c is { inicio: Date; llegada: Date } => c.llegada !== null)
    .map((c) => Math.round((c.llegada.getTime() - c.inicio.getTime()) / 60_000))
    .sort((a, b) => a - b)
  if (diferencias.length < MINIMO_PARA_PUNTUALIDAD) return null

  const medio = Math.floor(diferencias.length / 2)
  const mediana =
    diferencias.length % 2 === 1
      ? diferencias[medio]!
      : Math.round((diferencias[medio - 1]! + diferencias[medio]!) / 2)
  const base = new Date(0)
  return {
    llegada: calcularLlegada(base, new Date(mediana * 60_000)),
    citas: diferencias.length,
  }
}

/** "Suele llegar 25 min tarde", "Suele llegar 10 min antes" o "Suele llegar a tiempo". */
export function textoPuntualidad(llegada: Llegada): string {
  switch (llegada.tipo) {
    case 'a_tiempo':
      return 'Suele llegar a tiempo'
    case 'tarde':
      return `Suele llegar ${formatearDuracion(llegada.minutos)} tarde`
    case 'temprano':
      return `Suele llegar ${formatearDuracion(llegada.minutos)} antes`
  }
}

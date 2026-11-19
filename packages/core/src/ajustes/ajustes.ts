import { z } from 'zod'
import { esHoraValida, sumarDias, type Fecha } from '../fechas/fechas'

/** Colores de lugar de docs/diseno.md. El rojo no está: es para los choques. */
export const COLORES_LUGAR = ['azul', 'verde', 'amarillo', 'morado', 'terracota', 'gris'] as const
export type ColorLugar = (typeof COLORES_LUGAR)[number]

/** Nombres de los días, por día ISO (1 lunes … 7 domingo). */
export const NOMBRES_DIAS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
}

export const DatosLugar = z.object({
  id: z.uuid(),
  nombre: z.string().trim().min(2, 'Escribe el nombre del lugar.').max(60, 'Máximo 60 caracteres.'),
  color: z.enum(COLORES_LUGAR, 'Elige un color.'),
  controlaSillon: z.boolean(),
  direccion: z
    .string()
    .trim()
    .max(200, 'Máximo 200 caracteres.')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
})
export type DatosLugar = z.infer<typeof DatosLugar>

const hora = z.string().refine(esHoraValida, 'Elige una hora válida.')

/** Uno o varios días con el mismo tramo: "lunes a viernes de 10:00 a 13:00 en el consultorio". */
export const NuevosTramos = z
  .object({
    profesionalId: z.uuid('Elige la profesional.'),
    lugarId: z.uuid('Elige el lugar.'),
    dias: z
      .array(z.number().int().min(1).max(7))
      .min(1, 'Elige al menos un día.')
      .transform((d) => [...new Set(d)].sort()),
    horaInicio: hora,
    horaFin: hora,
  })
  .refine((t) => t.horaFin > t.horaInicio, {
    message: 'La hora de fin tiene que ser después de la de inicio.',
    path: ['horaFin'],
  })
export type NuevosTramos = z.infer<typeof NuevosTramos>

/** Un tramo ya guardado, solo con lo que importa para ver si se superpone. */
export interface TramoExistente {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

/**
 * Días en los que el tramo nuevo se superpone con uno que la profesional ya
 * tiene. Un tramo puede empezar justo cuando termina otro.
 */
export function diasConSuperposicion(
  nuevo: Pick<NuevosTramos, 'dias' | 'horaInicio' | 'horaFin'>,
  existentes: TramoExistente[],
): number[] {
  return nuevo.dias.filter((dia) =>
    existentes.some(
      (e) =>
        e.diaSemana === dia &&
        nuevo.horaInicio < e.horaFin.slice(0, 5) &&
        e.horaInicio.slice(0, 5) < nuevo.horaFin,
    ),
  )
}

/**
 * Cómo se quita un tramo (0004): no se borra, se cierra el día anterior para
 * que las semanas pasadas conserven su horario. Si empezó a valer hoy o
 * después, no tiene historia: se borra (borrado suave).
 */
export function comoQuitarTramo(
  vigenteDesde: Fecha,
  hoy: Fecha,
): { tipo: 'cerrar'; vigenteHasta: Fecha } | { tipo: 'borrar' } {
  return vigenteDesde < hoy
    ? { tipo: 'cerrar', vigenteHasta: sumarDias(hoy, -1) }
    : { tipo: 'borrar' }
}

/** "Lunes, martes y viernes" */
export function listarDias(dias: number[]): string {
  const nombres = dias.map((d, i) => (i === 0 ? NOMBRES_DIAS[d]! : NOMBRES_DIAS[d]!.toLowerCase()))
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

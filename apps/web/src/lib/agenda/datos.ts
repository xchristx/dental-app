import 'server-only'
import { EstadoCita, ZONA_LA_PAZ, rangoDeLaSemana, type Fecha } from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'

// Por ahora la zona es fija; la organización ya guarda la suya (zona_horaria).
export const ZONA = ZONA_LA_PAZ

export const COLORES_LUGAR = ['azul', 'verde', 'amarillo', 'morado', 'terracota', 'gris'] as const
export type ColorLugar = (typeof COLORES_LUGAR)[number]

export interface CitaAgenda {
  id: string
  inicio: Date
  fin: Date
  estado: EstadoCita
  llegada: Date | null
  /** null en los bloqueos. */
  paciente: string | null
  tipo: string | null
  nota: string | null
  lugar: { nombre: string; color: ColorLugar }
  /** Solo si la cita es de otra profesional (por ejemplo, una socia en tu consultorio). */
  otraProfesional: string | null
}

/** Todas las citas que tocan la semana, de todas las profesionales de la organización. */
export async function citasDeLaSemana(lunes: Fecha): Promise<CitaAgenda[]> {
  const supabase = await crearClienteServidor()
  const { desde, hasta } = rangoDeLaSemana(lunes, ZONA)

  const [citas, propia] = await Promise.all([
    supabase
      .from('citas')
      .select(
        `id, inicio, fin, estado, llegada_at, nota, profesional_id,
         paciente:pacientes(nombre),
         tipo:tipos_cita(nombre),
         lugar:lugares(nombre, color),
         profesional:profesionales(nombre)`,
      )
      .is('deleted_at', null)
      // Se superpone con la semana: empieza antes de que termine y termina después de que empiece.
      .lt('inicio', hasta.toISOString())
      .gt('fin', desde.toISOString())
      .order('inicio'),
    profesionalDelUsuario(),
  ])

  if (citas.error) throw new Error(`No se pudieron leer las citas: ${citas.error.message}`)

  return citas.data.map((c) => ({
    id: c.id,
    inicio: new Date(c.inicio),
    fin: new Date(c.fin),
    estado: EstadoCita.parse(c.estado),
    llegada: c.llegada_at ? new Date(c.llegada_at) : null,
    paciente: c.paciente?.nombre ?? null,
    tipo: c.tipo?.nombre ?? null,
    nota: c.nota,
    lugar: {
      nombre: c.lugar.nombre,
      color: (COLORES_LUGAR as readonly string[]).includes(c.lugar.color)
        ? (c.lugar.color as ColorLugar)
        : 'gris',
    },
    otraProfesional: c.profesional_id !== propia ? c.profesional.nombre : null,
  }))
}

/** Profesional asociada a la usuaria que entró (0007). Puede no tener ninguna. */
async function profesionalDelUsuario(): Promise<string | null> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()
  const usuario = sesion?.claims.sub
  if (!usuario) return null

  const { data } = await supabase
    .from('miembros')
    .select('profesional_id')
    .eq('user_id', usuario)
    .is('deleted_at', null)
    .maybeSingle()
  return data?.profesional_id ?? null
}

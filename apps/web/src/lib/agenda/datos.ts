import {
  COLORES_LUGAR,
  EstadoCita,
  rangoDeLaSemana,
  type ColorLugar,
  type Fecha,
} from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'
import { ZONA } from './zona'

export { ZONA }
export type { ColorLugar }

export interface CitaAgenda {
  id: string
  inicio: Date
  fin: Date
  /** El fin acordado, si la cita se extendió por una llegada tarde (0013). */
  finPrevisto: Date | null
  estado: EstadoCita
  llegada: Date | null
  profesionalId: string
  lugarId: string
  tipoCitaId: string | null
  /** La cita de la que viene, si se reagendó (0012). */
  reagendadaDesde: string | null
  /** null en los bloqueos. */
  paciente: string | null
  pacienteId: string | null
  telefono: string | null
  tipo: string | null
  nota: string | null
  lugar: { nombre: string; color: ColorLugar }
  profesional: string
  /** Especialidad de la profesional, si la tiene (0014). */
  especialidad: string | null
  /** Solo si la cita es de otra profesional (por ejemplo, una socia en tu consultorio). */
  otraProfesional: string | null
  recordatorioEnviado: Date | null
}

/** Todas las citas que tocan la semana, de todas las profesionales de la organización. */
export async function citasDeLaSemana(lunes: Fecha): Promise<CitaAgenda[]> {
  const { desde, hasta } = rangoDeLaSemana(lunes, ZONA)

  const [citas, propia] = await Promise.all([
    supabase
      .from('citas')
      .select(
        `id, inicio, fin, estado, llegada_at, recordatorio_enviado_at, nota,
         fin_previsto, profesional_id, lugar_id, tipo_cita_id, reagendada_desde,
         paciente:pacientes(id, nombre, telefono),
         tipo:tipos_cita(nombre),
         lugar:lugares(nombre, color),
         profesional:profesionales(nombre, especialidad)`,
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
    finPrevisto: c.fin_previsto ? new Date(c.fin_previsto) : null,
    estado: EstadoCita.parse(c.estado),
    llegada: c.llegada_at ? new Date(c.llegada_at) : null,
    profesionalId: c.profesional_id,
    lugarId: c.lugar_id,
    tipoCitaId: c.tipo_cita_id,
    reagendadaDesde: c.reagendada_desde,
    paciente: c.paciente?.nombre ?? null,
    pacienteId: c.paciente?.id ?? null,
    telefono: c.paciente?.telefono ?? null,
    tipo: c.tipo?.nombre ?? null,
    nota: c.nota,
    lugar: {
      nombre: c.lugar.nombre,
      color: (COLORES_LUGAR as readonly string[]).includes(c.lugar.color)
        ? (c.lugar.color as ColorLugar)
        : 'gris',
    },
    profesional: c.profesional.nombre,
    especialidad: c.profesional.especialidad,
    otraProfesional: c.profesional_id !== propia ? c.profesional.nombre : null,
    recordatorioEnviado: c.recordatorio_enviado_at ? new Date(c.recordatorio_enviado_at) : null,
  }))
}

/** Profesional asociada a la usuaria que entró (0007). Puede no tener ninguna. */
async function profesionalDelUsuario(): Promise<string | null> {
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

/** De qué cita viene y a cuál se pasó una cita reagendada (0012). */
export interface EnlacesReagenda {
  desde: { id: string; inicio: Date } | null
  hacia: { id: string; inicio: Date } | null
}

/**
 * Los enlaces de reagenda de todas las citas de la semana, en una sola
 * consulta. Así el detalle de una cita se abre sin ir al servidor.
 */
export async function enlacesDeLaSemana(
  citas: Pick<CitaAgenda, 'id' | 'reagendadaDesde'>[],
): Promise<Record<string, EnlacesReagenda>> {
  if (citas.length === 0) return {}
  // Los id vienen de la base: son UUID, no texto de la usuaria.
  const origenes = citas.flatMap((c) => (c.reagendadaDesde ? [c.reagendadaDesde] : []))
  const filtros = [`reagendada_desde.in.(${citas.map((c) => c.id).join(',')})`]
  if (origenes.length > 0) filtros.push(`id.in.(${origenes.join(',')})`)

  const { data, error } = await supabase
    .from('citas')
    .select('id, inicio, reagendada_desde')
    .is('deleted_at', null)
    .or(filtros.join(','))
  if (error) throw new Error(`No se pudieron leer las citas reagendadas: ${error.message}`)

  const enlace = (c: { id: string; inicio: string } | undefined) =>
    c ? { id: c.id, inicio: new Date(c.inicio) } : null
  return Object.fromEntries(
    citas.map((c) => [
      c.id,
      {
        desde: enlace(data.find((d) => d.id === c.reagendadaDesde)),
        hacia: enlace(data.find((d) => d.reagendada_desde === c.id)),
      },
    ]),
  )
}

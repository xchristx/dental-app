import 'server-only'
import type { Horario } from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export interface OpcionesAgendar {
  profesionales: { id: string; nombre: string; margenTrasladoMin: number }[]
  lugares: { id: string; nombre: string; controlaSillon: boolean }[]
  tiposCita: { id: string; nombre: string; duracionMin: number }[]
  pacientes: { id: string; nombre: string; telefono: string | null }[]
  /** Horarios de atención de todas las profesionales (0004). */
  horarios: Horario[]
  /** Profesional de la usuaria que entró, para elegirla por defecto. */
  profesionalPropia: string | null
}

/** Lo que necesita el formulario de "Agendar". RLS deja ver solo la organización propia. */
export async function opcionesParaAgendar(): Promise<OpcionesAgendar> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()

  const [profesionales, lugares, tipos, pacientes, horarios, miembro] = await Promise.all([
    supabase
      .from('profesionales')
      .select('id, nombre, margen_traslado_min')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('lugares')
      .select('id, nombre, controla_sillon')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('tipos_cita')
      .select('id, nombre, duracion_min')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('pacientes')
      .select('id, nombre, telefono')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('horarios')
      .select(
        'profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin, vigente_desde, vigente_hasta',
      )
      .is('deleted_at', null),
    supabase
      .from('miembros')
      .select('profesional_id')
      .eq('user_id', sesion?.claims.sub ?? '')
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  for (const r of [profesionales, lugares, tipos, pacientes, horarios]) {
    if (r.error) throw new Error(`No se pudieron leer los datos para agendar: ${r.error.message}`)
  }

  return {
    profesionales: (profesionales.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      margenTrasladoMin: p.margen_traslado_min,
    })),
    lugares: (lugares.data ?? []).map((l) => ({
      id: l.id,
      nombre: l.nombre,
      controlaSillon: l.controla_sillon,
    })),
    tiposCita: (tipos.data ?? []).map((t) => ({
      id: t.id,
      nombre: t.nombre,
      duracionMin: t.duracion_min,
    })),
    pacientes: pacientes.data ?? [],
    horarios: (horarios.data ?? []).map((h) => ({
      profesionalId: h.profesional_id,
      lugarId: h.lugar_id,
      diaSemana: h.dia_semana,
      horaInicio: h.hora_inicio,
      horaFin: h.hora_fin,
      vigenteDesde: h.vigente_desde,
      vigenteHasta: h.vigente_hasta,
    })),
    profesionalPropia: miembro.data?.profesional_id ?? null,
  }
}

import 'server-only'
import { COLORES_LUGAR, fechaEnZona, type ColorLugar } from '@dental/core'
import { ZONA } from '@/lib/agenda/zona'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export interface LugarAjustes {
  id: string
  nombre: string
  color: ColorLugar
  controlaSillon: boolean
  direccion: string | null
}

export interface TramoAjustes {
  id: string
  profesionalId: string
  lugarId: string
  diaSemana: number
  /** "HH:MM" */
  horaInicio: string
  horaFin: string
}

export interface ProfesionalAjustes {
  id: string
  nombre: string
  especialidad: string | null
  margenTrasladoMin: number
  /** Si tiene un usuario para entrar a la app (0007). */
  tieneUsuario: boolean
}

export interface DatosAjustes {
  lugares: LugarAjustes[]
  profesionales: ProfesionalAjustes[]
  /** Tramos que valen hoy o más adelante. Los cerrados quedan como historia. */
  tramos: TramoAjustes[]
  profesionalPropia: string | null
  /** La admin gestiona profesionales y horarios de todas; una socia, solo los suyos (0014). */
  esAdmin: boolean
}

export async function datosDeAjustes(): Promise<DatosAjustes> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()
  const hoy = fechaEnZona(new Date(), ZONA)

  const [lugares, profesionales, horarios, miembro, conUsuario] = await Promise.all([
    supabase
      .from('lugares')
      .select('id, nombre, color, controla_sillon, direccion')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('profesionales')
      .select('id, nombre, especialidad, margen_traslado_min')
      .is('deleted_at', null)
      .order('nombre'),
    supabase
      .from('horarios')
      .select('id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin')
      .is('deleted_at', null)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
      .order('dia_semana')
      .order('hora_inicio'),
    supabase
      .from('miembros')
      .select('profesional_id, rol')
      .eq('user_id', sesion?.claims.sub ?? '')
      .is('deleted_at', null)
      .maybeSingle(),
    supabase.from('miembros').select('profesional_id').is('deleted_at', null),
  ])

  for (const r of [lugares, profesionales, horarios]) {
    if (r.error) throw new Error(`No se pudieron leer los ajustes: ${r.error.message}`)
  }

  return {
    lugares: (lugares.data ?? []).map((l) => ({
      id: l.id,
      nombre: l.nombre,
      color: (COLORES_LUGAR as readonly string[]).includes(l.color)
        ? (l.color as ColorLugar)
        : 'gris',
      controlaSillon: l.controla_sillon,
      direccion: l.direccion,
    })),
    profesionales: (profesionales.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      especialidad: p.especialidad,
      margenTrasladoMin: p.margen_traslado_min,
      tieneUsuario: (conUsuario.data ?? []).some((m) => m.profesional_id === p.id),
    })),
    tramos: (horarios.data ?? []).map((h) => ({
      id: h.id,
      profesionalId: h.profesional_id,
      lugarId: h.lugar_id,
      diaSemana: h.dia_semana,
      horaInicio: h.hora_inicio.slice(0, 5),
      horaFin: h.hora_fin.slice(0, 5),
    })),
    profesionalPropia: miembro.data?.profesional_id ?? null,
    esAdmin: miembro.data?.rol === 'admin',
  }
}

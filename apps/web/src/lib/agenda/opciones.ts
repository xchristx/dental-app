import 'server-only'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export interface OpcionesAgendar {
  profesionales: { id: string; nombre: string }[]
  lugares: { id: string; nombre: string }[]
  tiposCita: { id: string; nombre: string; duracionMin: number }[]
  pacientes: { id: string; nombre: string; telefono: string | null }[]
  /** Profesional de la usuaria que entró, para elegirla por defecto. */
  profesionalPropia: string | null
}

/** Lo que necesita el formulario de "Agendar". RLS deja ver solo la organización propia. */
export async function opcionesParaAgendar(): Promise<OpcionesAgendar> {
  const supabase = await crearClienteServidor()
  const { data: sesion } = await supabase.auth.getClaims()

  const [profesionales, lugares, tipos, pacientes, miembro] = await Promise.all([
    supabase.from('profesionales').select('id, nombre').is('deleted_at', null).order('nombre'),
    supabase.from('lugares').select('id, nombre').is('deleted_at', null).order('nombre'),
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
      .from('miembros')
      .select('profesional_id')
      .eq('user_id', sesion?.claims.sub ?? '')
      .is('deleted_at', null)
      .maybeSingle(),
  ])

  for (const r of [profesionales, lugares, tipos, pacientes]) {
    if (r.error) throw new Error(`No se pudieron leer los datos para agendar: ${r.error.message}`)
  }

  return {
    profesionales: profesionales.data ?? [],
    lugares: lugares.data ?? [],
    tiposCita: (tipos.data ?? []).map((t) => ({
      id: t.id,
      nombre: t.nombre,
      duracionMin: t.duracion_min,
    })),
    pacientes: pacientes.data ?? [],
    profesionalPropia: miembro.data?.profesional_id ?? null,
  }
}

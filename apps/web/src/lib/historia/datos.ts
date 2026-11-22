import { supabase } from '@/lib/supabase/cliente'

/** La versión vigente de la anamnesis (la última que se guardó). */
export interface Anamnesis {
  antecedentesPersonales: string | null
  antecedentesFamiliares: string | null
  alergias: string | null
  sinAlergias: boolean
  medicamentos: string | null
  actualizada: Date
  profesional: string | null
}

export interface Evolucion {
  id: string
  citaId: string | null
  fecha: string
  texto: string
  autorId: string | null
  profesional: string | null
  creadaEn: Date
}

export interface HistoriaClinica {
  organizacionId: string
  anamnesis: Anamnesis | null
  /** De la más nueva a la más vieja. */
  evoluciones: Evolucion[]
}

/**
 * Anamnesis vigente y evolución de un paciente (0018). La usan la ficha del
 * paciente y el detalle de la cita, con la misma clave de caché.
 */
export function consultaHistoria(pacienteId: string) {
  return {
    queryKey: ['historia', pacienteId],
    queryFn: () => historiaDePaciente(pacienteId),
  }
}

async function historiaDePaciente(pacienteId: string): Promise<HistoriaClinica | null> {
  const [paciente, anamnesis, evoluciones] = await Promise.all([
    supabase.from('pacientes').select('organization_id').eq('id', pacienteId).maybeSingle(),
    supabase
      .from('anamnesis')
      .select(
        `antecedentes_personales, antecedentes_familiares, alergias, sin_alergias, medicamentos,
         created_at, profesional:profesionales(nombre)`,
      )
      .eq('paciente_id', pacienteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('evoluciones')
      .select('id, cita_id, fecha, texto, autor_id, created_at, profesional:profesionales(nombre)')
      .eq('paciente_id', pacienteId)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (paciente.error) throw new Error(`No se pudo leer el paciente: ${paciente.error.message}`)
  if (anamnesis.error) throw new Error(`No se pudo leer la anamnesis: ${anamnesis.error.message}`)
  if (evoluciones.error) {
    throw new Error(`No se pudo leer la evolución: ${evoluciones.error.message}`)
  }
  if (!paciente.data) return null

  const a = anamnesis.data
  return {
    organizacionId: paciente.data.organization_id,
    anamnesis: a && {
      antecedentesPersonales: a.antecedentes_personales,
      antecedentesFamiliares: a.antecedentes_familiares,
      alergias: a.alergias,
      sinAlergias: a.sin_alergias,
      medicamentos: a.medicamentos,
      actualizada: new Date(a.created_at),
      profesional: a.profesional?.nombre ?? null,
    },
    evoluciones: evoluciones.data.map((e) => ({
      id: e.id,
      citaId: e.cita_id,
      fecha: e.fecha,
      texto: e.texto,
      autorId: e.autor_id,
      profesional: e.profesional?.nombre ?? null,
      creadaEn: new Date(e.created_at),
    })),
  }
}

/** Id de quien entró: para saber qué evoluciones puede corregir. */
export function consultaUsuario() {
  return {
    queryKey: ['usuario'],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
    staleTime: Infinity,
  }
}

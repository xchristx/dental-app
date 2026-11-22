import {
  CARAS,
  INDICES_CODIGO,
  SIMBOLOS_CODIGO,
  type Cara,
  type CodigoOdontograma,
  type RegistroOdontograma,
} from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'

export interface Codigo extends CodigoOdontograma {
  /** Dado de baja del catálogo: sus registros se siguen viendo, pero no se usa para agregar. */
  activo: boolean
}

const COLUMNAS_CODIGO =
  'id, abreviatura, nombre, tipo, simbolo, por_caras, usa_grado, indice, deleted_at'

interface FilaCodigo {
  id: string
  abreviatura: string
  nombre: string
  tipo: string
  simbolo: string
  por_caras: boolean
  usa_grado: boolean
  indice: string | null
  deleted_at: string | null
}

function codigoDeFila(c: FilaCodigo): Codigo {
  return {
    id: c.id,
    abreviatura: c.abreviatura,
    nombre: c.nombre,
    tipo: c.tipo === 'realizado' ? 'realizado' : 'hallazgo',
    simbolo: SIMBOLOS_CODIGO.find((s) => s === c.simbolo) ?? 'texto',
    porCaras: c.por_caras,
    usaGrado: c.usa_grado,
    indice: INDICES_CODIGO.find((i) => i === c.indice) ?? null,
    activo: c.deleted_at === null,
  }
}

export interface CodigoCatalogo extends Codigo {
  /** Si ya hay registros con este código: no cambia de tipo, caras ni grado (0022). */
  usado: boolean
}

/** El catálogo de la organización para editarlo en Ajustes (0022). */
export const consultaCatalogo = {
  queryKey: ['odontograma', 'catalogo'],
  queryFn: async (): Promise<CodigoCatalogo[]> => {
    const [codigos, usados] = await Promise.all([
      supabase
        .from('odontograma_codigos')
        .select(COLUMNAS_CODIGO)
        .order('orden')
        .order('abreviatura'),
      supabase.rpc('odontograma_codigos_usados'),
    ])
    if (codigos.error) throw new Error(`No se pudo leer el catálogo: ${codigos.error.message}`)
    if (usados.error) throw new Error(`No se pudo leer el catálogo: ${usados.error.message}`)
    const enUso = new Set(usados.data)
    return codigos.data.map((c) => ({ ...codigoDeFila(c), usado: enUso.has(c.id) }))
  },
}

export interface Odontograma {
  organizacionId: string
  /** Todo el catálogo, en su orden. */
  codigos: Codigo[]
  /** Registros vigentes, del más nuevo al más viejo. */
  registros: RegistroOdontograma[]
}

const esCara = (c: string): c is Cara => (CARAS as readonly string[]).includes(c)

/** Catálogo y registros vigentes de un paciente (0020). */
export function consultaOdontograma(pacienteId: string) {
  return {
    queryKey: ['odontograma', pacienteId],
    queryFn: () => odontogramaDePaciente(pacienteId),
  }
}

async function odontogramaDePaciente(pacienteId: string): Promise<Odontograma | null> {
  const [paciente, codigos, registros] = await Promise.all([
    supabase.from('pacientes').select('organization_id').eq('id', pacienteId).maybeSingle(),
    supabase
      .from('odontograma_codigos')
      .select(COLUMNAS_CODIGO)
      .order('orden')
      .order('abreviatura'),
    supabase
      .from('odontograma_registros')
      .select('id, pieza, codigo_id, resuelve_id, caras, grado, nota, fecha')
      .eq('paciente_id', pacienteId)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (paciente.error) throw new Error(`No se pudo leer el paciente: ${paciente.error.message}`)
  if (codigos.error) throw new Error(`No se pudo leer el catálogo: ${codigos.error.message}`)
  if (registros.error) {
    throw new Error(`No se pudo leer el odontograma: ${registros.error.message}`)
  }
  if (!paciente.data) return null

  const organizacionId = paciente.data.organization_id
  return {
    organizacionId,
    codigos: codigos.data.map(codigoDeFila),
    registros: registros.data.map((r) => ({
      id: r.id,
      pieza: r.pieza,
      codigoId: r.codigo_id,
      resuelveId: r.resuelve_id,
      caras: r.caras?.filter(esCara) ?? null,
      grado: r.grado,
      nota: r.nota,
      fecha: r.fecha,
    })),
  }
}

import {
  CARAS,
  type Cara,
  type CodigoOdontograma,
  type IndiceCodigo,
  type RegistroOdontograma,
  type SimboloCodigo,
} from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'

export interface Codigo extends CodigoOdontograma {
  /** Dado de baja del catálogo: sus registros se siguen viendo, pero no se usa para agregar. */
  activo: boolean
}

export interface Odontograma {
  organizacionId: string
  /** Todo el catálogo, en su orden. */
  codigos: Codigo[]
  /** Registros vigentes, del más nuevo al más viejo. */
  registros: RegistroOdontograma[]
}

const SIMBOLOS: SimboloCodigo[] = [
  'superficie',
  'cruz',
  'circulo',
  'linea_vertical',
  'linea_horizontal',
  'texto',
]
const INDICES: IndiceCodigo[] = ['cariado', 'perdido', 'obturado']

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
      .select('id, abreviatura, nombre, tipo, simbolo, por_caras, usa_grado, indice, deleted_at')
      .order('orden')
      .order('abreviatura'),
    supabase
      .from('odontograma_registros')
      .select('id, pieza, codigo_id, caras, grado, nota, fecha')
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
    codigos: codigos.data.map((c) => ({
      id: c.id,
      abreviatura: c.abreviatura,
      nombre: c.nombre,
      tipo: c.tipo === 'realizado' ? 'realizado' : 'hallazgo',
      simbolo: SIMBOLOS.find((s) => s === c.simbolo) ?? 'texto',
      porCaras: c.por_caras,
      usaGrado: c.usa_grado,
      indice: INDICES.find((i) => i === c.indice) ?? null,
      activo: c.deleted_at === null,
    })),
    registros: registros.data.map((r) => ({
      id: r.id,
      pieza: r.pieza,
      codigoId: r.codigo_id,
      caras: r.caras?.filter(esCara) ?? null,
      grado: r.grado,
      nota: r.nota,
      fecha: r.fecha,
    })),
  }
}

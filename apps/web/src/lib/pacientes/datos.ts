import 'server-only'
import { EstadoCita } from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export interface PacienteLista {
  id: string
  nombre: string
  telefono: string | null
  fechaNacimiento: string | null
}

export interface CitaDelPaciente {
  id: string
  inicio: Date
  fin: Date
  estado: EstadoCita
  llegada: Date | null
  tipo: string | null
  lugar: string
  profesional: string
}

export interface FichaPaciente extends PacienteLista {
  citas: CitaDelPaciente[]
}

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function listaDePacientes(): Promise<PacienteLista[]> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('pacientes')
    .select('id, nombre, telefono, fecha_nacimiento')
    .is('deleted_at', null)
    .order('nombre')
  if (error) throw new Error(`No se pudieron leer los pacientes: ${error.message}`)
  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono,
    fechaNacimiento: p.fecha_nacimiento,
  }))
}

/** Ficha con todas sus citas, de la más nueva a la más vieja. null si no existe. */
export async function fichaDePaciente(id: string): Promise<FichaPaciente | null> {
  if (!ES_UUID.test(id)) return null
  const supabase = await crearClienteServidor()
  const [paciente, citas] = await Promise.all([
    supabase
      .from('pacientes')
      .select('id, nombre, telefono, fecha_nacimiento')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('citas')
      .select(
        `id, inicio, fin, estado, llegada_at,
         tipo:tipos_cita(nombre), lugar:lugares(nombre), profesional:profesionales(nombre)`,
      )
      .eq('paciente_id', id)
      .is('deleted_at', null)
      .order('inicio', { ascending: false }),
  ])
  if (paciente.error) throw new Error(`No se pudo leer el paciente: ${paciente.error.message}`)
  if (citas.error) throw new Error(`No se pudieron leer sus citas: ${citas.error.message}`)
  if (!paciente.data) return null

  const p = paciente.data
  return {
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono,
    fechaNacimiento: p.fecha_nacimiento,
    citas: citas.data.map((c) => ({
      id: c.id,
      inicio: new Date(c.inicio),
      fin: new Date(c.fin),
      estado: EstadoCita.parse(c.estado),
      llegada: c.llegada_at ? new Date(c.llegada_at) : null,
      tipo: c.tipo?.nombre ?? null,
      lugar: c.lugar.nombre,
      profesional: c.profesional.nombre,
    })),
  }
}

'use server'

import { refresh } from 'next/cache'
import { DatosPaciente } from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export type ResultadoPaciente = { ok: true; id: string } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar el paciente. Revisa tu conexión e inténtalo de nuevo.'

/** Crea o edita la ficha básica de un paciente (el id lo genera el cliente, 0003). */
export async function guardarPaciente(datos: unknown): Promise<ResultadoPaciente> {
  const validacion = DatosPaciente.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const p = validacion.data
  const supabase = await crearClienteServidor()
  const campos = { nombre: p.nombre, telefono: p.telefono, fecha_nacimiento: p.fechaNacimiento }

  // Primero se intenta editar; si no existe, se crea.
  const editado = await supabase.from('pacientes').update(campos).eq('id', p.id).select('id')
  if (editado.error) {
    console.error(`[pacientes:editar] código=${editado.error.code}: ${editado.error.message}`)
    return { ok: false, error: ERROR_GENERICO }
  }

  if (!editado.data?.length) {
    const { data: orgs } = await supabase.rpc('org_ids_del_usuario')
    const organizacion = Array.isArray(orgs) && typeof orgs[0] === 'string' ? orgs[0] : null
    if (!organizacion) return { ok: false, error: 'Tu usuario no tiene acceso a ninguna agenda.' }

    const { error } = await supabase
      .from('pacientes')
      .insert({ id: p.id, organization_id: organizacion, ...campos })
    // Reintento de algo que ya se guardó: no es un error.
    if (error && !(error.code === '23505' && error.message.includes('pacientes_pkey'))) {
      console.error(`[pacientes:crear] código=${error.code}: ${error.message}`)
      return { ok: false, error: ERROR_GENERICO }
    }
  }

  refresh()
  return { ok: true, id: p.id }
}

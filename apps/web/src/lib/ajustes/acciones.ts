'use server'

import { refresh } from 'next/cache'
import {
  DatosLugar,
  DatosProfesional,
  NuevosTramos,
  comoQuitarTramo,
  diasConSuperposicion,
  fechaEnZona,
  listarDias,
} from '@dental/core'
import { ZONA } from '@/lib/agenda/zona'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export type ResultadoAjustes = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar el cambio. Revisa tu conexión e inténtalo de nuevo.'
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>

async function organizacionDelUsuario(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.rpc('org_ids_del_usuario')
  return Array.isArray(data) && typeof data[0] === 'string' ? data[0] : null
}

function registrar(accion: string, error: { code?: string; message: string }) {
  console.error(`[ajustes:${accion}] código=${error.code ?? '-'}: ${error.message}`)
}

/** Crea o edita un lugar de trabajo (el id lo genera el cliente, 0003). */
export async function guardarLugar(datos: unknown): Promise<ResultadoAjustes> {
  const validacion = DatosLugar.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const lugar = validacion.data
  const supabase = await crearClienteServidor()
  const campos = {
    nombre: lugar.nombre,
    color: lugar.color,
    controla_sillon: lugar.controlaSillon,
    direccion: lugar.direccion,
  }

  // Primero se intenta editar; si no existe, se crea.
  const editado = await supabase.from('lugares').update(campos).eq('id', lugar.id).select('id')
  if (editado.error) {
    // Pasar a "un solo sillón" falla si ya hay citas superpuestas en ese lugar (0002).
    if (editado.error.code === '23P01') {
      return {
        ok: false,
        error:
          'Ya hay citas que se superponen en este lugar. Para marcar que tiene un solo sillón, primero mueve o cancela una de ellas.',
      }
    }
    registrar('editar-lugar', editado.error)
    return { ok: false, error: ERROR_GENERICO }
  }

  if (!editado.data?.length) {
    const organizacion = await organizacionDelUsuario(supabase)
    if (!organizacion) return { ok: false, error: 'Tu usuario no tiene acceso a ninguna agenda.' }
    const { error } = await supabase
      .from('lugares')
      .insert({ id: lugar.id, organization_id: organizacion, ...campos })
    if (error) {
      registrar('crear-lugar', error)
      return { ok: false, error: ERROR_GENERICO }
    }
  }

  refresh()
  return { ok: true }
}

/**
 * Agrega un tramo de atención en uno o varios días (0004). Vale desde hoy;
 * no puede superponerse con otro tramo de la misma profesional.
 */
export async function agregarTramos(datos: unknown): Promise<ResultadoAjustes> {
  const validacion = NuevosTramos.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const nuevo = validacion.data
  const supabase = await crearClienteServidor()
  const hoy = fechaEnZona(new Date(), ZONA)

  const existentes = await supabase
    .from('horarios')
    .select('dia_semana, hora_inicio, hora_fin')
    .eq('profesional_id', nuevo.profesionalId)
    .in('dia_semana', nuevo.dias)
    .is('deleted_at', null)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
  if (existentes.error) {
    registrar('leer-horarios', existentes.error)
    return { ok: false, error: ERROR_GENERICO }
  }

  const choques = diasConSuperposicion(
    nuevo,
    existentes.data.map((e) => ({
      diaSemana: e.dia_semana,
      horaInicio: e.hora_inicio,
      horaFin: e.hora_fin,
    })),
  )
  if (choques.length > 0) {
    return {
      ok: false,
      error: `Ese horario se superpone con otro que ya tienes (${listarDias(choques).toLowerCase()}). Quita el anterior primero.`,
    }
  }

  const organizacion = await organizacionDelUsuario(supabase)
  if (!organizacion) return { ok: false, error: 'Tu usuario no tiene acceso a ninguna agenda.' }

  const { error } = await supabase.from('horarios').insert(
    nuevo.dias.map((dia) => ({
      organization_id: organizacion,
      profesional_id: nuevo.profesionalId,
      lugar_id: nuevo.lugarId,
      dia_semana: dia,
      hora_inicio: nuevo.horaInicio,
      hora_fin: nuevo.horaFin,
      vigente_desde: hoy,
    })),
  )
  if (error) {
    registrar('agregar-tramos', error)
    return {
      ok: false,
      error: error.code === '23503' ? 'Ese lugar o profesional ya no existe.' : ERROR_GENERICO,
    }
  }

  refresh()
  return { ok: true }
}

/** Quita un tramo: lo cierra ayer para conservar la historia, o lo borra si es de hoy (0004). */
export async function quitarTramo(id: string): Promise<ResultadoAjustes> {
  if (!ES_UUID.test(id)) return { ok: false, error: 'No encontramos ese horario.' }
  const supabase = await crearClienteServidor()
  const { data: tramo } = await supabase
    .from('horarios')
    .select('vigente_desde')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!tramo) return { ok: false, error: 'No encontramos ese horario. Recarga la página.' }

  const como = comoQuitarTramo(tramo.vigente_desde, fechaEnZona(new Date(), ZONA))
  const { error } = await supabase
    .from('horarios')
    .update(
      como.tipo === 'cerrar'
        ? { vigente_hasta: como.vigenteHasta }
        : { deleted_at: new Date().toISOString() },
    )
    .eq('id', id)
  if (error) {
    registrar('quitar-tramo', error)
    return { ok: false, error: ERROR_GENERICO }
  }

  refresh()
  return { ok: true }
}

/** Minutos que necesita la profesional para ir de un lugar a otro (0004). */
export async function guardarMargenTraslado(
  profesionalId: string,
  minutos: number,
): Promise<ResultadoAjustes> {
  if (!ES_UUID.test(profesionalId) || !Number.isInteger(minutos) || minutos < 0 || minutos > 240) {
    return { ok: false, error: 'Elige un tiempo válido.' }
  }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('profesionales')
    .update({ margen_traslado_min: minutos })
    .eq('id', profesionalId)
    .select('id')
  if (error) {
    registrar('margen', error)
    return { ok: false, error: ERROR_GENERICO }
  }
  if (!data?.length) return { ok: false, error: 'No encontramos a esa profesional.' }

  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Profesionales (0014)
// ---------------------------------------------------------------------------

/**
 * Crea o edita una profesional: nombre y especialidad. Solo la admin crea;
 * una socia puede editar sus propios datos. Los permisos los aplica RLS.
 */
export async function guardarProfesional(datos: unknown): Promise<ResultadoAjustes> {
  const validacion = DatosProfesional.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const profesional = validacion.data
  const supabase = await crearClienteServidor()
  const campos = { nombre: profesional.nombre, especialidad: profesional.especialidad }

  const editado = await supabase
    .from('profesionales')
    .update(campos)
    .eq('id', profesional.id)
    .is('deleted_at', null)
    .select('id')
  if (editado.error) {
    registrar('editar-profesional', editado.error)
    return { ok: false, error: ERROR_GENERICO }
  }

  if (!editado.data?.length) {
    const organizacion = await organizacionDelUsuario(supabase)
    if (!organizacion) return { ok: false, error: 'Tu usuario no tiene acceso a ninguna agenda.' }
    const { error } = await supabase
      .from('profesionales')
      .insert({ id: profesional.id, organization_id: organizacion, ...campos })
    if (error) {
      // El id ya existe pero RLS no deja editarlo: es de otra profesional.
      if (error.code === '42501' || error.code === '23505') {
        return { ok: false, error: 'Solo la administradora puede agregar o editar profesionales.' }
      }
      registrar('crear-profesional', error)
      return { ok: false, error: ERROR_GENERICO }
    }
  }

  refresh()
  return { ok: true }
}

/**
 * Da de baja a una profesional (borrado suave). Postgres no lo permite si
 * tiene usuario o citas pendientes; acá se cuenta cuántas para explicarlo.
 */
export async function darDeBajaProfesional(id: string): Promise<ResultadoAjustes> {
  if (!ES_UUID.test(id)) return { ok: false, error: 'No encontramos a esa profesional.' }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('profesionales')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id')

  if (error) {
    if (error.code === 'PR001') {
      return {
        ok: false,
        error: 'Tiene un usuario para entrar a la app. Primero hay que quitarle el acceso.',
      }
    }
    if (error.code === 'PR002') {
      const { count } = await supabase
        .from('citas')
        .select('id', { count: 'exact', head: true })
        .eq('profesional_id', id)
        .is('deleted_at', null)
        .in('estado', ['agendada', 'confirmada'])
        .gt('fin', new Date().toISOString())
      return {
        ok: false,
        error:
          count === 1
            ? 'Tiene una cita pendiente. Reagéndala o cancélala antes de darla de baja.'
            : `Tiene ${count ?? 'varias'} citas pendientes. Reagéndalas o cancélalas antes de darla de baja.`,
      }
    }
    if (error.code === '42501') {
      return { ok: false, error: 'Solo la administradora puede dar de baja a una profesional.' }
    }
    registrar('baja-profesional', error)
    return { ok: false, error: ERROR_GENERICO }
  }
  if (!data?.length) {
    return { ok: false, error: 'Solo la administradora puede dar de baja a una profesional.' }
  }

  refresh()
  return { ok: true }
}

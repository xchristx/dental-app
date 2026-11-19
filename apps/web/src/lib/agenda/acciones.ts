'use server'

import { refresh } from 'next/cache'
import {
  ESTADOS_QUE_OCUPAN,
  NuevaCita,
  formatearHora,
  rangoDeLaCita,
  type Fecha,
} from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ZONA } from './datos'

export type ResultadoAgendar = { ok: true; fecha: Fecha } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar la cita. Revisa tu conexión e inténtalo de nuevo.'

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>

export async function agendarCita(datos: unknown): Promise<ResultadoAgendar> {
  const validacion = NuevaCita.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const cita = validacion.data
  const supabase = await crearClienteServidor()

  const organizacion = await organizacionDelUsuario(supabase)
  if (!organizacion) return { ok: false, error: 'Tu usuario no tiene acceso a ninguna agenda.' }

  let pacienteId: string | null = null
  if (cita.paciente.tipo === 'existente') pacienteId = cita.paciente.id
  if (cita.paciente.tipo === 'nuevo') {
    // Con el id del cliente, reintentar no duplica al paciente (0003).
    const { error } = await supabase.from('pacientes').upsert(
      {
        id: cita.paciente.id,
        organization_id: organizacion,
        nombre: cita.paciente.nombre,
        telefono: cita.paciente.telefono,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    )
    if (error) {
      console.error(`[agendar] paciente código=${error.code}: ${error.message}`)
      return { ok: false, error: ERROR_GENERICO }
    }
    pacienteId = cita.paciente.id
  }

  const { inicio, fin } = rangoDeLaCita(cita, ZONA)
  const esBloqueo = cita.paciente.tipo === 'bloqueo'

  const { error } = await supabase.from('citas').insert({
    id: cita.id,
    organization_id: organizacion,
    profesional_id: cita.profesionalId,
    lugar_id: cita.lugarId,
    paciente_id: pacienteId,
    tipo_cita_id: esBloqueo ? null : cita.tipoCitaId,
    nota: cita.nota,
    inicio: inicio.toISOString(),
    fin: fin.toISOString(),
  })

  if (error) {
    // La cita ya se había guardado (por ejemplo, se tocó dos veces): no es un error.
    const yaExistia = error.code === '23505' && error.message.includes('citas_pkey')
    if (!yaExistia) {
      if (error.code === '23P01') {
        return {
          ok: false,
          error: await describirChoque(supabase, error.message, cita, inicio, fin),
        }
      }
      if (error.code === '23503') {
        return {
          ok: false,
          error: 'Algún dato ya no existe. Recarga la página e inténtalo de nuevo.',
        }
      }
      console.error(`[agendar] cita código=${error.code}: ${error.message}`)
      return { ok: false, error: ERROR_GENERICO }
    }
  }

  // La agenda se vuelve a leer con la cita nueva.
  refresh()
  return { ok: true, fecha: cita.fecha }
}

async function organizacionDelUsuario(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.rpc('org_ids_del_usuario')
  return Array.isArray(data) && typeof data[0] === 'string' ? data[0] : null
}

/**
 * Postgres rechazó la cita por una restricción de exclusión (0002). Se busca
 * la cita con la que choca para decir cuál es, en vez de un error genérico.
 */
async function describirChoque(
  supabase: Supabase,
  mensaje: string,
  cita: NuevaCita,
  inicio: Date,
  fin: Date,
): Promise<string> {
  const porSillon = mensaje.includes('citas_sin_choque_sillon')

  let consulta = supabase
    .from('citas')
    .select(
      'inicio, fin, nota, paciente:pacientes(nombre), lugar:lugares(nombre), profesional:profesionales(nombre)',
    )
    .is('deleted_at', null)
    .in('estado', [...ESTADOS_QUE_OCUPAN])
    .lt('inicio', fin.toISOString())
    .gt('fin', inicio.toISOString())
    .order('inicio')
    .limit(1)
  consulta = porSillon
    ? consulta.eq('lugar_id', cita.lugarId)
    : consulta.eq('profesional_id', cita.profesionalId)

  const { data } = await consulta.maybeSingle()
  if (!data) return 'Ese horario choca con otra cita.'

  const horario = `de ${formatearHora(new Date(data.inicio), ZONA)} a ${formatearHora(new Date(data.fin), ZONA)}`
  const quien = data.paciente?.nombre ?? data.nota ?? 'un bloqueo'

  if (porSillon) {
    return `${data.lugar.nombre} ya está ocupado ${horario} (${data.profesional.nombre}, ${quien}).`
  }
  const sujeto =
    cita.profesionalId === (await profesionalDelUsuario(supabase))
      ? 'Ya tienes'
      : `${data.profesional.nombre} ya tiene`
  return `${sujeto} una cita ${horario} en ${data.lugar.nombre} (${quien}).`
}

async function profesionalDelUsuario(supabase: Supabase): Promise<string | null> {
  const { data: sesion } = await supabase.auth.getClaims()
  const { data } = await supabase
    .from('miembros')
    .select('profesional_id')
    .eq('user_id', sesion?.claims.sub ?? '')
    .is('deleted_at', null)
    .maybeSingle()
  return data?.profesional_id ?? null
}

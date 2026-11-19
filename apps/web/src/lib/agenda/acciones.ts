'use server'

import { refresh } from 'next/cache'
import {
  ESTADOS_QUE_OCUPAN,
  EstadoCita,
  NuevaCita,
  ReagendarCita,
  esFechaValida,
  estadoAlReagendar,
  esHoraValida,
  fechaEnZona,
  formatearHora,
  inicioDelDia,
  instanteLocal,
  puedeCambiarA,
  rangoDeLaCita,
  sumarDias,
  telefonoParaWhatsApp,
  type Fecha,
} from '@dental/core'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { ZONA } from './zona'

export type ResultadoAgendar = { ok: true; fecha: Fecha } | { ok: false; error: string }

/** Una cita del día, lista para mandar al navegador (fechas como texto ISO). */
export interface CitaDelDia {
  id: string
  profesionalId: string
  lugarId: string
  inicio: string
  fin: string
  estado: EstadoCita
}

/**
 * Citas de un día, de todas las profesionales, para calcular huecos libres y
 * avisos en el formulario (0004). Se pide al cambiar la fecha.
 */
export async function ocupacionDelDia(fecha: string): Promise<CitaDelDia[]> {
  if (!esFechaValida(fecha)) return []
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('citas')
    .select('id, profesional_id, lugar_id, inicio, fin, estado')
    .is('deleted_at', null)
    .lt('inicio', inicioDelDia(sumarDias(fecha, 1), ZONA).toISOString())
    .gt('fin', inicioDelDia(fecha, ZONA).toISOString())
  if (error) throw new Error(`No se pudieron leer las citas del día: ${error.message}`)

  return data.map((c) => ({
    id: c.id,
    profesionalId: c.profesional_id,
    lugarId: c.lugar_id,
    inicio: c.inicio,
    fin: c.fin,
    estado: EstadoCita.parse(c.estado),
  }))
}

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
  cita: Pick<NuevaCita, 'profesionalId' | 'lugarId'>,
  inicio: Date,
  fin: Date,
  /** Al reagendar, la original vuelve a estar activa tras el rechazo: no es ella. */
  excluirId?: string,
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
  if (excluirId) consulta = consulta.neq('id', excluirId)
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

// ---------------------------------------------------------------------------
// Detalle de una cita: estado, llegada, recordatorio y teléfono (0005)
// ---------------------------------------------------------------------------

export type ResultadoCita = { ok: true } | { ok: false; error: string }

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NO_ENCONTRADA = {
  ok: false,
  error: 'No encontramos esa cita. Recarga la página.',
} as const satisfies ResultadoCita

async function leerCita(supabase: Supabase, id: string) {
  if (!ES_UUID.test(id)) return null
  const { data } = await supabase
    .from('citas')
    .select('id, estado, paciente_id, profesional_id, lugar_id, inicio, fin, llegada_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  return data
}

/**
 * Cambia el estado de una cita. "Llegó" (atendida) guarda la hora actual;
 * volver a agendada borra la llegada. Reactivar una cita puede chocar con otra.
 */
export async function cambiarEstadoCita(id: string, estado: string): Promise<ResultadoCita> {
  const nuevo = EstadoCita.safeParse(estado)
  if (!nuevo.success) return { ok: false, error: 'Estado no válido.' }
  const supabase = await crearClienteServidor()
  const cita = await leerCita(supabase, id)
  if (!cita) return NO_ENCONTRADA

  const actual = EstadoCita.parse(cita.estado)
  if (!puedeCambiarA(actual, nuevo.data, cita.paciente_id === null)) {
    return { ok: false, error: 'La cita ya cambió. Recarga la página.' }
  }
  // Reactivar una cita que ya se reagendó dejaría al paciente con dos citas (0012).
  if (nuevo.data === 'agendada' && (await yaSeReagendo(supabase, id))) {
    return {
      ok: false,
      error: 'Esta cita ya se reagendó. Si hace falta, cambia o cancela la cita nueva.',
    }
  }

  const llegada =
    nuevo.data === 'atendida'
      ? (cita.llegada_at ?? new Date().toISOString())
      : nuevo.data === 'agendada'
        ? null
        : cita.llegada_at

  const { error } = await supabase
    .from('citas')
    .update({ estado: nuevo.data, llegada_at: llegada })
    .eq('id', id)

  if (error) {
    if (error.code === '23P01') {
      const mensaje = await describirChoque(
        supabase,
        error.message,
        { profesionalId: cita.profesional_id, lugarId: cita.lugar_id },
        new Date(cita.inicio),
        new Date(cita.fin),
      )
      return { ok: false, error: `No se puede volver a agendar: ${mensaje}` }
    }
    console.error(`[estado] código=${error.code}: ${error.message}`)
    return { ok: false, error: ERROR_GENERICO }
  }

  refresh()
  return { ok: true }
}

/** Corrige la hora real de llegada ("HH:MM", hora local del día de la cita). */
export async function corregirLlegada(id: string, hora: string): Promise<ResultadoCita> {
  if (!esHoraValida(hora)) return { ok: false, error: 'Elige una hora válida.' }
  const supabase = await crearClienteServidor()
  const cita = await leerCita(supabase, id)
  if (!cita) return NO_ENCONTRADA
  if (cita.estado !== 'atendida') return { ok: false, error: 'Primero marca que llegó.' }

  const llegada = instanteLocal(fechaEnZona(new Date(cita.inicio), ZONA), hora, ZONA)
  const { error } = await supabase
    .from('citas')
    .update({ llegada_at: llegada.toISOString() })
    .eq('id', id)
  if (error) {
    console.error(`[llegada] código=${error.code}: ${error.message}`)
    return { ok: false, error: ERROR_GENERICO }
  }
  refresh()
  return { ok: true }
}

/** Marca que se envió el recordatorio por WhatsApp (0005). */
export async function marcarRecordatorioEnviado(id: string): Promise<ResultadoCita> {
  const supabase = await crearClienteServidor()
  const cita = await leerCita(supabase, id)
  if (!cita) return NO_ENCONTRADA
  const { error } = await supabase
    .from('citas')
    .update({ recordatorio_enviado_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.error(`[recordatorio] código=${error.code}: ${error.message}`)
    return { ok: false, error: ERROR_GENERICO }
  }
  refresh()
  return { ok: true }
}

/** Guarda el teléfono de un paciente, para poder enviarle recordatorios. */
export async function guardarTelefono(
  pacienteId: string,
  telefono: string,
): Promise<ResultadoCita> {
  if (!ES_UUID.test(pacienteId)) return NO_ENCONTRADA
  const limpio = telefono.trim()
  if (!telefonoParaWhatsApp(limpio)) {
    return {
      ok: false,
      error: 'Ese número no parece un celular. Escríbelo con 8 dígitos, por ejemplo 71234567.',
    }
  }
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('pacientes')
    .update({ telefono: limpio })
    .eq('id', pacienteId)
    .select('id')
  if (error) {
    console.error(`[telefono] código=${error.code}: ${error.message}`)
    return { ok: false, error: ERROR_GENERICO }
  }
  if (!data?.length) return NO_ENCONTRADA
  refresh()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Reagendar (0005 y 0012)
// ---------------------------------------------------------------------------

export type ResultadoReagendar =
  { ok: true; fecha: Fecha; id: string } | { ok: false; error: string }

async function yaSeReagendo(supabase: Supabase, id: string): Promise<boolean> {
  const { count } = await supabase
    .from('citas')
    .select('id', { count: 'exact', head: true })
    .eq('reagendada_desde', id)
    .is('deleted_at', null)
  return (count ?? 0) > 0
}

/**
 * Crea la cita nueva y deja la original cancelada o como "no asistió", en una
 * sola transacción de Postgres (reagendar_cita). El paciente es el de la original.
 */
export async function reagendarCita(datos: unknown): Promise<ResultadoReagendar> {
  const validacion = ReagendarCita.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const nueva = validacion.data
  const supabase = await crearClienteServidor()
  const original = await leerCita(supabase, nueva.citaOriginalId)
  if (!original) return NO_ENCONTRADA

  const estadoOriginal = estadoAlReagendar(
    { estado: EstadoCita.parse(original.estado), inicio: new Date(original.inicio) },
    new Date(),
  )
  const { inicio, fin } = rangoDeLaCita(nueva, ZONA)

  const { error } = await supabase.rpc('reagendar_cita', {
    p_original: nueva.citaOriginalId,
    p_estado_original: estadoOriginal,
    p_id: nueva.id,
    p_profesional: nueva.profesionalId,
    p_lugar: nueva.lugarId,
    p_inicio: inicio.toISOString(),
    p_fin: fin.toISOString(),
    p_tipo_cita: nueva.tipoCitaId ?? undefined,
    p_nota: nueva.nota ?? undefined,
  })

  if (error) {
    switch (error.code) {
      case '23P01':
        return {
          ok: false,
          error: await describirChoque(supabase, error.message, nueva, inicio, fin, original.id),
        }
      case 'RE002':
        return { ok: false, error: 'Esta cita ya se reagendó. Recarga la página.' }
      case 'RE001':
        return { ok: false, error: 'Esta cita no se puede reagendar.' }
      case 'P0002':
        return NO_ENCONTRADA
      case '23503':
        return {
          ok: false,
          error: 'Algún dato ya no existe. Recarga la página e inténtalo de nuevo.',
        }
      default:
        console.error(`[reagendar] código=${error.code}: ${error.message}`)
        return { ok: false, error: ERROR_GENERICO }
    }
  }

  refresh()
  return { ok: true, fecha: nueva.fecha, id: nueva.id }
}

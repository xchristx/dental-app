import { DatosAnamnesis, DatosDerivacion, DatosEvolucion } from '@dental/core'
import { refrescar } from '@/lib/consultas'
import { supabase } from '@/lib/supabase/cliente'

export type ResultadoHistoria = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.'

// Reglas de evoluciones_reglas (migración historia_clinica, 0018).
const MENSAJES: Record<string, string> = {
  EV001: 'Solo quien escribió la evolución la puede cambiar.',
  EV002: 'Una evolución solo se corrige el mismo día. Agrega una nueva para aclararla.',
  EV003: 'La fecha no puede ser futura.',
  EV004: 'La cita es de otro paciente.',
  // derivaciones_reglas (0019).
  DR001: 'La fecha no puede ser futura.',
}

function fallo(accion: string, error: { code?: string; message: string }): ResultadoHistoria {
  const mensaje = error.code ? MENSAJES[error.code] : undefined
  if (!mensaje) console.error(`[historia:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  return { ok: false, error: mensaje ?? ERROR_GENERICO }
}

/** Guarda una versión nueva de la anamnesis: nunca se edita la anterior. */
export async function guardarAnamnesis(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoHistoria> {
  const validacion = DatosAnamnesis.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const a = validacion.data
  const { error } = await supabase.from('anamnesis').insert({
    id: a.id,
    organization_id: organizacionId,
    paciente_id: a.pacienteId,
    antecedentes_personales: a.antecedentesPersonales,
    antecedentes_familiares: a.antecedentesFamiliares,
    alergias: a.alergias,
    sin_alergias: a.sinAlergias,
    medicamentos: a.medicamentos,
  })
  // Reintento de algo que ya se guardó: no es un error.
  if (error && !(error.code === '23505' && error.message.includes('anamnesis_pkey'))) {
    return fallo('anamnesis', error)
  }
  refrescar()
  return { ok: true }
}

/** Escribe una evolución nueva o corrige una del mismo día. */
export async function guardarEvolucion(
  datos: unknown,
  organizacionId: string,
  esNueva: boolean,
): Promise<ResultadoHistoria> {
  const validacion = DatosEvolucion.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const e = validacion.data
  const campos = { fecha: e.fecha, texto: e.texto, cita_id: e.citaId }

  if (esNueva) {
    const { error } = await supabase.from('evoluciones').insert({
      id: e.id,
      organization_id: organizacionId,
      paciente_id: e.pacienteId,
      ...campos,
    })
    if (error && !(error.code === '23505' && error.message.includes('evoluciones_pkey'))) {
      return fallo('evolucion:crear', error)
    }
  } else {
    const { error } = await supabase.from('evoluciones').update(campos).eq('id', e.id)
    if (error) return fallo('evolucion:editar', error)
  }
  refrescar()
  return { ok: true }
}

/** Borrado suave (0003). Solo el mismo día y por quien la escribió (0018). */
export async function borrarEvolucion(id: string): Promise<ResultadoHistoria> {
  const { error } = await supabase
    .from('evoluciones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('evolucion:borrar', error)
  refrescar()
  return { ok: true }
}

/** Anota una derivación nueva o corrige una existente (0019). */
export async function guardarDerivacion(
  datos: unknown,
  organizacionId: string,
  esNueva: boolean,
): Promise<ResultadoHistoria> {
  const validacion = DatosDerivacion.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const d = validacion.data
  const campos = {
    sentido: d.sentido,
    profesional_id: d.profesionalId,
    contacto: d.contacto,
    motivo: d.motivo,
    fecha: d.fecha,
  }

  if (esNueva) {
    const { error } = await supabase.from('derivaciones').insert({
      id: d.id,
      organization_id: organizacionId,
      paciente_id: d.pacienteId,
      ...campos,
    })
    if (error && !(error.code === '23505' && error.message.includes('derivaciones_pkey'))) {
      return fallo('derivacion:crear', error)
    }
  } else {
    const { error } = await supabase.from('derivaciones').update(campos).eq('id', d.id)
    if (error) return fallo('derivacion:editar', error)
  }
  refrescar()
  return { ok: true }
}

/** Borrado suave (0003). */
export async function borrarDerivacion(id: string): Promise<ResultadoHistoria> {
  const { error } = await supabase
    .from('derivaciones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('derivacion:borrar', error)
  refrescar()
  return { ok: true }
}

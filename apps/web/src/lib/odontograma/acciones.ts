import { DatosRegistroOdontograma } from '@dental/core'
import { refrescar } from '@/lib/consultas'
import { supabase } from '@/lib/supabase/cliente'

export type ResultadoOdontograma = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.'

// Reglas de las migraciones odontograma (0020) y odontograma_tratar (0021).
const MENSAJES: Record<string, string> = {
  OD001: 'Elige al menos una cara.',
  OD002: 'Este código no lleva grado.',
  OD003: 'La fecha no puede ser futura.',
  OD004: 'Para marcar un hallazgo como tratado, elige algo realizado.',
  OD005: 'Solo se trata un hallazgo vigente de la misma pieza.',
  '23514': 'Esa pieza no existe.',
}

function fallo(accion: string, error: { code?: string; message: string }): ResultadoOdontograma {
  // Un hallazgo se trata una sola vez (índice único sobre resuelve_id).
  if (error.code === '23505' && error.message.includes('resuelve_unico')) {
    return { ok: false, error: 'Ese hallazgo ya está tratado.' }
  }
  const mensaje = error.code ? MENSAJES[error.code] : undefined
  if (!mensaje) {
    console.error(`[odontograma:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  }
  return { ok: false, error: mensaje ?? ERROR_GENERICO }
}

/** Agrega un registro; con `resuelveId`, marca ese hallazgo como tratado (0021). */
export async function agregarRegistro(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoOdontograma> {
  const validacion = DatosRegistroOdontograma.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const r = validacion.data
  const { error } = await supabase.from('odontograma_registros').insert({
    id: r.id,
    organization_id: organizacionId,
    paciente_id: r.pacienteId,
    codigo_id: r.codigoId,
    resuelve_id: r.resuelveId,
    pieza: r.pieza,
    caras: r.caras,
    grado: r.grado,
    nota: r.nota,
    fecha: r.fecha,
  })
  // Reintento de algo que ya se guardó: no es un error.
  if (error && !(error.code === '23505' && error.message.includes('odontograma_registros_pkey'))) {
    return fallo('agregar', error)
  }
  refrescar()
  return { ok: true }
}

/**
 * Anula un registro cargado por error (borrado suave, 0003). Si era un
 * tratamiento, el hallazgo que trataba vuelve a quedar pendiente (0021).
 */
export async function anularRegistro(id: string): Promise<ResultadoOdontograma> {
  const { error } = await supabase
    .from('odontograma_registros')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('anular', error)
  refrescar()
  return { ok: true }
}

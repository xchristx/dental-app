import { DatosRegistroOdontograma } from '@dental/core'
import { refrescar } from '@/lib/consultas'
import { supabase } from '@/lib/supabase/cliente'

export type ResultadoOdontograma = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.'

// Reglas de odontograma_registros_reglas (migración odontograma, 0020).
const MENSAJES: Record<string, string> = {
  OD001: 'Elige al menos una cara.',
  OD002: 'Este código no lleva grado.',
  OD003: 'La fecha no puede ser futura.',
  '23514': 'Esa pieza no existe.',
}

function fallo(accion: string, error: { code?: string; message: string }): ResultadoOdontograma {
  const mensaje = error.code ? MENSAJES[error.code] : undefined
  if (!mensaje) {
    console.error(`[odontograma:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  }
  return { ok: false, error: mensaje ?? ERROR_GENERICO }
}

/** Agrega un registro al odontograma de un paciente. */
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

/** Quita un registro: ya se trató o estaba mal (borrado suave, 0003). */
export async function quitarRegistro(id: string): Promise<ResultadoOdontograma> {
  const { error } = await supabase
    .from('odontograma_registros')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('quitar', error)
  refrescar()
  return { ok: true }
}

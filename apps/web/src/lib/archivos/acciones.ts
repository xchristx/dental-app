import { DatosArchivo, rutaDeArchivo } from '@dental/core'
import { refrescar } from '@/lib/consultas'
import { supabase } from '@/lib/supabase/cliente'
import { prepararArchivo } from './achicar'

export type ResultadoArchivos = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos subir el archivo. Revisa tu conexión e inténtalo de nuevo.'

const MENSAJES: Record<string, string> = {
  AR001: 'En la demo no se suben archivos.',
  AR003: 'La fecha no puede ser futura.',
}

function fallo(accion: string, error: { code?: string; message: string }): ResultadoArchivos {
  const mensaje = error.code ? MENSAJES[error.code] : undefined
  if (!mensaje) console.error(`[archivos:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  return { ok: false, error: mensaje ?? ERROR_GENERICO }
}

/**
 * Sube una radiografía o una foto de la ficha (0027): primero el archivo (ya
 * achicado) a Storage y después su fila. Si la fila falla, el objeto queda
 * huérfano en Storage, sin verse.
 */
export async function subirArchivo(
  archivo: File,
  datos: { id: string; pacienteId: string; tipo: string; nota: string; fecha: string },
  organizacionId: string,
): Promise<ResultadoArchivos> {
  const preparado = await prepararArchivo(archivo)
  if (!preparado) {
    return { ok: false, error: 'Ese formato no se puede subir. Usa una foto (JPG o PNG) o un PDF.' }
  }
  const validacion = DatosArchivo.safeParse({
    ...datos,
    mime: preparado.mime,
    bytes: preparado.contenido.size,
  })
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const a = validacion.data
  const ruta = rutaDeArchivo(organizacionId, a.pacienteId, a.id, a.mime)

  const subida = await supabase.storage
    .from('archivos')
    .upload(ruta, preparado.contenido, { contentType: a.mime, upsert: false })
  // Reintento: el objeto ya está; se sigue con la fila.
  if (subida.error && !/exists/i.test(subida.error.message)) {
    if (/row-level security|unauthorized/i.test(subida.error.message)) {
      return { ok: false, error: MENSAJES.AR001 ?? ERROR_GENERICO }
    }
    return fallo('subir', { message: subida.error.message })
  }

  const { error } = await supabase.from('archivos').insert({
    id: a.id,
    organization_id: organizacionId,
    paciente_id: a.pacienteId,
    tipo: a.tipo,
    ruta,
    mime: a.mime,
    bytes: a.bytes,
    nota: a.nota,
    fecha: a.fecha,
  })
  if (error && !(error.code === '23505' && error.message.includes('archivos_pkey'))) {
    return fallo('registrar', error)
  }
  refrescar()
  return { ok: true }
}

/** Anula un archivo subido por error (borrado suave). El objeto queda en Storage. */
export async function anularArchivo(id: string): Promise<ResultadoArchivos> {
  const { error } = await supabase
    .from('archivos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('anular', error)
  refrescar()
  return { ok: true }
}

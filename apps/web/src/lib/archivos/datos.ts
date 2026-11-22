import { MIME_ARCHIVO, TIPOS_ARCHIVO, type MimeArchivo, type TipoArchivo } from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'

export interface Archivo {
  id: string
  tipo: TipoArchivo
  mime: MimeArchivo
  bytes: number
  nota: string | null
  fecha: string
  /** URL firmada: vence en una hora (0027). */
  url: string | null
}

export interface ArchivosDelPaciente {
  organizacionId: string
  /** La demo no sube archivos (0027). */
  permiteArchivos: boolean
  /** Del más nuevo al más viejo. */
  archivos: Archivo[]
}

const UNA_HORA = 60 * 60

/** Radiografías y fotos de un paciente, con URLs firmadas para verlas. */
export function consultaArchivos(pacienteId: string) {
  return {
    queryKey: ['archivos', pacienteId],
    queryFn: () => archivosDePaciente(pacienteId),
    // Las URLs vencen en una hora: se renuevan antes.
    staleTime: 30 * 60 * 1000,
  }
}

async function archivosDePaciente(pacienteId: string): Promise<ArchivosDelPaciente | null> {
  const [paciente, archivos] = await Promise.all([
    supabase
      .from('pacientes')
      .select('organization_id, organizacion:organizaciones(permite_archivos)')
      .eq('id', pacienteId)
      .maybeSingle(),
    supabase
      .from('archivos')
      .select('id, tipo, mime, bytes, nota, fecha, ruta')
      .eq('paciente_id', pacienteId)
      .in('tipo', ['radiografia', 'foto'])
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (paciente.error) throw new Error(`No se pudo leer el paciente: ${paciente.error.message}`)
  if (archivos.error) throw new Error(`No se pudieron leer los archivos: ${archivos.error.message}`)
  if (!paciente.data) return null

  const rutas = archivos.data.map((a) => a.ruta)
  const firmadas = rutas.length
    ? await supabase.storage.from('archivos').createSignedUrls(rutas, UNA_HORA)
    : { data: [], error: null }
  if (firmadas.error)
    throw new Error(`No se pudieron abrir los archivos: ${firmadas.error.message}`)
  const urlDe = new Map(
    (firmadas.data ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl]] : [])),
  )

  return {
    organizacionId: paciente.data.organization_id,
    permiteArchivos: paciente.data.organizacion?.permite_archivos ?? false,
    archivos: archivos.data.map((a) => ({
      id: a.id,
      tipo: TIPOS_ARCHIVO.find((t) => t === a.tipo) ?? 'foto',
      mime: MIME_ARCHIVO.find((m) => m === a.mime) ?? 'image/jpeg',
      bytes: a.bytes,
      nota: a.nota,
      fecha: a.fecha,
      url: urlDe.get(a.ruta) ?? null,
    })),
  }
}

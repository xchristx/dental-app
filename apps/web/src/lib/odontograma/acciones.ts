import {
  DatosCodigoOdontograma,
  DatosExamenBucal,
  DatosRegistroOdontograma,
  DatosRxOdontograma,
} from '@dental/core'
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
  // 0022: el código se dio de baja mientras el panel estaba abierto.
  OD007: 'Ese código ya no se usa. Elige otro.',
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

/** Registra que se tomó una radiografía de una pieza (0023). */
export async function agregarRx(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoOdontograma> {
  const validacion = DatosRxOdontograma.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const rx = validacion.data
  const { error } = await supabase.from('odontograma_rx').insert({
    id: rx.id,
    organization_id: organizacionId,
    paciente_id: rx.pacienteId,
    pieza: rx.pieza,
    fecha: rx.fecha,
    nota: rx.nota,
  })
  // Reintento de algo que ya se guardó: no es un error.
  if (error && !(error.code === '23505' && error.message.includes('odontograma_rx_pkey'))) {
    return fallo('agregar-rx', error)
  }
  refrescar()
  return { ok: true }
}

/** Anula una radiografía cargada por error (borrado suave, 0003). */
export async function anularRx(id: string): Promise<ResultadoOdontograma> {
  const { error } = await supabase
    .from('odontograma_rx')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('anular-rx', error)
  refrescar()
  return { ok: true }
}

/** Guarda una versión nueva del examen bucal; la anterior no se borra (0024). */
export async function guardarExamenBucal(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoOdontograma> {
  const validacion = DatosExamenBucal.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const e = validacion.data
  const { error } = await supabase.from('examen_bucal').insert({
    id: e.id,
    organization_id: organizacionId,
    paciente_id: e.pacienteId,
    usa_mondadientes: e.usaMondadientes,
    cepilla_lengua: e.cepillaLengua,
    tartaro: e.tartaro,
    halitosis: e.halitosis,
    placa_bacteriana: e.placaBacteriana,
    materia_alba: e.materiaAlba,
    oclusion: e.oclusion,
    observaciones: e.observaciones,
  })
  // Reintento de algo que ya se guardó: no es un error.
  if (error && !(error.code === '23505' && error.message.includes('examen_bucal_pkey'))) {
    return fallo('examen', error)
  }
  refrescar()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Catálogo (0022). Lo cambia solo la administradora: lo aplica RLS.
// ---------------------------------------------------------------------------

const SOLO_ADMIN = 'Solo la administradora puede cambiar el catálogo.'

function falloCatalogo(accion: string, error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return { ok: false as const, error: 'Ya hay un código en uso con esa abreviatura.' }
  }
  if (error.code === 'OD006') {
    return {
      ok: false as const,
      error:
        'Este código ya se usó: no se puede cambiar si es hallazgo o realizado, si va por caras ni si lleva grado. Puedes darlo de baja y crear otro.',
    }
  }
  if (error.code === '42501') return { ok: false as const, error: SOLO_ADMIN }
  console.error(`[catalogo:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  return { ok: false as const, error: ERROR_GENERICO }
}

/** Crea o edita un código. Uno nuevo va al final de su grupo. */
export async function guardarCodigo(datos: unknown): Promise<ResultadoOdontograma> {
  const validacion = DatosCodigoOdontograma.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const c = validacion.data
  const campos = {
    abreviatura: c.abreviatura,
    nombre: c.nombre,
    tipo: c.tipo,
    simbolo: c.simbolo,
    por_caras: c.porCaras,
    usa_grado: c.usaGrado,
    indice: c.indice,
  }

  const editado = await supabase
    .from('odontograma_codigos')
    .update(campos)
    .eq('id', c.id)
    .select('id')
  if (editado.error) return falloCatalogo('editar', editado.error)

  if (!editado.data.length) {
    const [organizacion, ultimo] = await Promise.all([
      supabase.rpc('org_ids_del_usuario'),
      supabase
        .from('odontograma_codigos')
        .select('orden')
        .eq('tipo', c.tipo)
        .order('orden', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    const org = Array.isArray(organizacion.data) ? organizacion.data[0] : null
    if (typeof org !== 'string') return { ok: false, error: SOLO_ADMIN }
    const { error } = await supabase.from('odontograma_codigos').insert({
      id: c.id,
      organization_id: org,
      orden: (ultimo.data?.orden ?? 0) + 10,
      ...campos,
    })
    if (error) return falloCatalogo('crear', error)
  }

  refrescar()
  return { ok: true }
}

/**
 * Da de baja un código o lo vuelve a usar. Dado de baja, no se usa para
 * agregar, pero los registros que ya lo usan se siguen viendo (0022).
 */
export async function cambiarBajaCodigo(id: string, baja: boolean): Promise<ResultadoOdontograma> {
  const { data, error } = await supabase
    .from('odontograma_codigos')
    .update({ deleted_at: baja ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
  if (error) return falloCatalogo(baja ? 'baja' : 'volver', error)
  if (!data.length) return { ok: false, error: SOLO_ADMIN }
  refrescar()
  return { ok: true }
}

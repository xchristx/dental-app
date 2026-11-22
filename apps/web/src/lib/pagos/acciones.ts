import { DatosAjuste, DatosPago, DatosPresupuesto } from '@dental/core'
import { refrescar } from '@/lib/consultas'
import { supabase } from '@/lib/supabase/cliente'

export type ResultadoPagos = { ok: true } | { ok: false; error: string }

const ERROR_GENERICO = 'No pudimos guardar. Revisa tu conexión e inténtalo de nuevo.'

// Reglas de la migración pagos (0026).
const MENSAJES: Record<string, string> = {
  PG001: 'El pago supera el saldo. Revisa el monto.',
  PG002: 'El ajuste dejaría el saldo negativo. Revisa el monto.',
  PG003: 'Este presupuesto ya tiene pagos o ajustes: no se puede anular.',
  PG004: 'El total no se cambia: registra un ajuste.',
  PG005: 'La fecha no puede ser futura.',
}

function fallo(accion: string, error: { code?: string; message: string }): ResultadoPagos {
  const mensaje = error.code ? MENSAJES[error.code] : undefined
  if (!mensaje) console.error(`[pagos:${accion}] código=${error.code ?? '-'}: ${error.message}`)
  return { ok: false, error: mensaje ?? ERROR_GENERICO }
}

/** Reintento de algo que ya se guardó: no es un error (el id lo genera el cliente). */
const yaGuardado = (error: { code?: string; message: string }, tabla: string) =>
  error.code === '23505' && error.message.includes(`${tabla}_pkey`)

export async function crearPresupuesto(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoPagos> {
  const validacion = DatosPresupuesto.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const p = validacion.data
  const { error } = await supabase.from('presupuestos').insert({
    id: p.id,
    organization_id: organizacionId,
    paciente_id: p.pacienteId,
    descripcion: p.descripcion,
    total_centavos: p.totalCentavos,
    cuota_inicial_centavos: p.cuotaInicialCentavos,
    cuota_sugerida_centavos: p.cuotaSugeridaCentavos,
    fecha: p.fecha,
  })
  if (error && !yaGuardado(error, 'presupuestos')) return fallo('crear', error)
  refrescar()
  return { ok: true }
}

/** Anula un presupuesto cargado por error. Postgres no lo deja si ya tiene movimientos. */
export async function anularPresupuesto(id: string): Promise<ResultadoPagos> {
  const { error } = await supabase
    .from('presupuestos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo('anular', error)
  refrescar()
  return { ok: true }
}

export async function registrarPago(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoPagos> {
  const validacion = DatosPago.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const p = validacion.data
  const { error } = await supabase.from('movimientos_pago').insert({
    id: p.id,
    organization_id: organizacionId,
    presupuesto_id: p.presupuestoId,
    tipo: 'pago',
    monto_centavos: p.montoCentavos,
    forma_pago: p.formaPago,
    fecha: p.fecha,
  })
  if (error && !yaGuardado(error, 'movimientos_pago')) return fallo('pago', error)
  refrescar()
  return { ok: true }
}

export async function registrarAjuste(
  datos: unknown,
  organizacionId: string,
): Promise<ResultadoPagos> {
  const validacion = DatosAjuste.safeParse(datos)
  if (!validacion.success) {
    return { ok: false, error: validacion.error.issues[0]?.message ?? 'Revisa los datos.' }
  }
  const a = validacion.data
  const { error } = await supabase.from('movimientos_pago').insert({
    id: a.id,
    organization_id: organizacionId,
    presupuesto_id: a.presupuestoId,
    tipo: 'ajuste',
    monto_centavos: a.montoCentavos,
    motivo: a.motivo,
    fecha: a.fecha,
  })
  if (error && !yaGuardado(error, 'movimientos_pago')) return fallo('ajuste', error)
  refrescar()
  return { ok: true }
}

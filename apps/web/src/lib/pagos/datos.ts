import { FORMAS_PAGO, type MovimientoPago } from '@dental/core'
import { supabase } from '@/lib/supabase/cliente'

export interface Presupuesto {
  id: string
  descripcion: string
  totalCentavos: number
  cuotaInicialCentavos: number | null
  cuotaSugeridaCentavos: number | null
  fecha: string
  profesional: string | null
  /** En el orden en que se cargaron. */
  movimientos: MovimientoPago[]
}

export interface PagosDelPaciente {
  organizacionId: string
  /** Del más nuevo al más viejo. */
  presupuestos: Presupuesto[]
}

/** Presupuestos y movimientos de un paciente (0026). */
export function consultaPagos(pacienteId: string) {
  return {
    queryKey: ['pagos', pacienteId],
    queryFn: () => pagosDePaciente(pacienteId),
  }
}

async function pagosDePaciente(pacienteId: string): Promise<PagosDelPaciente | null> {
  const [paciente, presupuestos] = await Promise.all([
    supabase.from('pacientes').select('organization_id').eq('id', pacienteId).maybeSingle(),
    supabase
      .from('presupuestos')
      .select(
        `id, descripcion, total_centavos, cuota_inicial_centavos, cuota_sugerida_centavos, fecha,
         profesional:profesionales(nombre),
         movimientos:movimientos_pago(id, tipo, monto_centavos, forma_pago, motivo, fecha,
           numero_recibo, created_at)`,
      )
      .eq('paciente_id', pacienteId)
      .is('deleted_at', null)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (paciente.error) throw new Error(`No se pudo leer el paciente: ${paciente.error.message}`)
  if (presupuestos.error) {
    throw new Error(`No se pudieron leer los pagos: ${presupuestos.error.message}`)
  }
  if (!paciente.data) return null

  return {
    organizacionId: paciente.data.organization_id,
    presupuestos: presupuestos.data.map((p) => ({
      id: p.id,
      descripcion: p.descripcion,
      totalCentavos: p.total_centavos,
      cuotaInicialCentavos: p.cuota_inicial_centavos,
      cuotaSugeridaCentavos: p.cuota_sugerida_centavos,
      fecha: p.fecha,
      profesional: p.profesional?.nombre ?? null,
      movimientos: [...p.movimientos]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          id: m.id,
          tipo: m.tipo === 'ajuste' ? 'ajuste' : 'pago',
          montoCentavos: m.monto_centavos,
          formaPago: FORMAS_PAGO.find((f) => f === m.forma_pago) ?? null,
          motivo: m.motivo,
          fecha: m.fecha,
          numeroRecibo: m.numero_recibo,
        })),
    })),
  }
}

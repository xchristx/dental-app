import { z } from 'zod'
import { ZONA_LA_PAZ, esFechaValida, fechaEnZona, type Fecha } from '../fechas/fechas'

// Presupuestos y libro de pagos (decisión 0026). Montos en centavos (0003).

export const FORMAS_PAGO = ['efectivo', 'qr', 'transferencia'] as const
export type FormaPago = (typeof FORMAS_PAGO)[number]

export const NOMBRE_FORMA_PAGO: Record<FormaPago, string> = {
  efectivo: 'Efectivo',
  qr: 'QR',
  transferencia: 'Transferencia',
}

/** "Bs 1.000" o "Bs 1.000,50". Con `signo`, "+Bs 500" o "−Bs 200". */
export function formatearMonto(centavos: number, { signo = false } = {}): string {
  const absoluto = Math.abs(centavos)
  const enteros = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const resto = absoluto % 100
  const texto = `Bs ${enteros}${resto ? `,${resto.toString().padStart(2, '0')}` : ''}`
  if (centavos < 0) return `−${texto}`
  return signo && centavos > 0 ? `+${texto}` : texto
}

/**
 * Lee un monto escrito a mano y lo pasa a centavos: "400", "1.000",
 * "1000,50", "400.50" o "Bs 400". Devuelve null si no es un monto.
 */
export function parsearMonto(texto: string): number | null {
  let limpio = texto.replace(/bs\.?/i, '').replace(/\s/g, '')
  if (!limpio) return null
  if (limpio.includes(',')) {
    // Coma decimal: los puntos son de miles.
    limpio = limpio.replace(/\./g, '').replace(',', '.')
  } else if (!/^\d+\.\d{1,2}$/.test(limpio)) {
    // "1.000" o "1.000.000": puntos de miles. "400.50" queda como decimal.
    limpio = limpio.replace(/\./g, '')
  }
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return null
  const [enteros = '0', decimales = ''] = limpio.split('.')
  return Number(enteros) * 100 + Number(decimales.padEnd(2, '0'))
}

export interface MovimientoPago {
  id: string
  tipo: 'pago' | 'ajuste'
  /** Pago: positivo. Ajuste: positivo sube el saldo, negativo lo baja. */
  montoCentavos: number
  formaPago: FormaPago | null
  motivo: string | null
  fecha: Fecha
  numeroRecibo: number | null
}

export interface FilaPlanilla<M extends MovimientoPago> {
  movimiento: M
  saldoAnterior: number
  saldoActual: number
}

/**
 * La planilla como la de papel: cada movimiento con el saldo anterior y el
 * actual. `movimientos` va en el orden en que se cargaron; se ordena por fecha.
 */
export function planillaDePagos<M extends MovimientoPago>(
  totalCentavos: number,
  movimientos: M[],
): { filas: FilaPlanilla<M>[]; saldo: number; pagado: number } {
  const ordenados = movimientos
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.fecha === b.m.fecha ? a.i - b.i : a.m.fecha < b.m.fecha ? -1 : 1))
    .map(({ m }) => m)
  let saldo = totalCentavos
  let pagado = 0
  const filas = ordenados.map((movimiento) => {
    const saldoAnterior = saldo
    if (movimiento.tipo === 'pago') {
      saldo -= movimiento.montoCentavos
      pagado += movimiento.montoCentavos
    } else {
      saldo += movimiento.montoCentavos
    }
    return { movimiento, saldoAnterior, saldoActual: saldo }
  })
  return { filas, saldo, pagado }
}

/**
 * Lo que se propone al registrar un pago: la cuota inicial en el primero y la
 * cuota sugerida después, sin pasar del saldo.
 */
export function montoSugerido(
  presupuesto: { cuotaInicialCentavos: number | null; cuotaSugeridaCentavos: number | null },
  saldo: number,
  hayPagos: boolean,
): number | null {
  const cuota = hayPagos
    ? presupuesto.cuotaSugeridaCentavos
    : (presupuesto.cuotaInicialCentavos ?? presupuesto.cuotaSugeridaCentavos)
  if (saldo <= 0) return null
  return cuota ? Math.min(cuota, saldo) : saldo
}

const fecha = z
  .string()
  .refine(esFechaValida, 'Elige una fecha válida.')
  .refine((v) => v <= fechaEnZona(new Date(), ZONA_LA_PAZ), 'La fecha no puede ser futura.')

const centavos = (mensaje: string) => z.number().int(mensaje).positive(mensaje)

/** Un presupuesto nuevo. */
export const DatosPresupuesto = z
  .object({
    id: z.uuid(),
    pacienteId: z.uuid(),
    descripcion: z
      .string()
      .trim()
      .min(1, 'Escribe qué tratamiento es.')
      .max(120, 'Máximo 120 caracteres.'),
    totalCentavos: centavos('Escribe el total.'),
    cuotaInicialCentavos: centavos('Revisa la cuota inicial.').nullable(),
    cuotaSugeridaCentavos: centavos('Revisa la cuota sugerida.').nullable(),
    fecha,
  })
  .refine((p) => !p.cuotaInicialCentavos || p.cuotaInicialCentavos <= p.totalCentavos, {
    message: 'La cuota inicial no puede ser mayor que el total.',
    path: ['cuotaInicialCentavos'],
  })
export type DatosPresupuesto = z.infer<typeof DatosPresupuesto>

/** Un pago de un presupuesto. */
export const DatosPago = z.object({
  id: z.uuid(),
  presupuestoId: z.uuid(),
  montoCentavos: centavos('Escribe el monto.'),
  formaPago: z.enum(FORMAS_PAGO, 'Elige cómo pagó.'),
  fecha,
})
export type DatosPago = z.infer<typeof DatosPago>

/** Un ajuste: sube el saldo (positivo) o lo baja (negativo), con motivo. */
export const DatosAjuste = z.object({
  id: z.uuid(),
  presupuestoId: z.uuid(),
  montoCentavos: z
    .number()
    .int('Escribe el monto.')
    .refine((v) => v !== 0, 'Escribe el monto.'),
  motivo: z.string().trim().min(1, 'Escribe el motivo.').max(300, 'Máximo 300 caracteres.'),
  fecha,
})
export type DatosAjuste = z.infer<typeof DatosAjuste>

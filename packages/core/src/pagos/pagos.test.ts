import { describe, expect, it } from 'vitest'
import {
  DatosAjuste,
  DatosPago,
  DatosPresupuesto,
  formatearMonto,
  montoSugerido,
  parsearMonto,
  planillaDePagos,
  type MovimientoPago,
} from './pagos'

describe('montos', () => {
  it('escribe los montos como en Bolivia', () => {
    expect(formatearMonto(100000)).toBe('Bs 1.000')
    expect(formatearMonto(650050)).toBe('Bs 6.500,50')
    expect(formatearMonto(40005)).toBe('Bs 400,05')
    expect(formatearMonto(0)).toBe('Bs 0')
    expect(formatearMonto(50000, { signo: true })).toBe('+Bs 500')
    expect(formatearMonto(-20000)).toBe('−Bs 200')
  })

  it('lee lo que se escribe a mano', () => {
    expect(parsearMonto('400')).toBe(40000)
    expect(parsearMonto('1.000')).toBe(100000)
    expect(parsearMonto('Bs 1.000,50')).toBe(100050)
    expect(parsearMonto('400.5')).toBe(40050)
    expect(parsearMonto('1.234.567')).toBe(123456700)
    expect(parsearMonto('')).toBeNull()
    expect(parsearMonto('cuatrocientos')).toBeNull()
    expect(parsearMonto('1,234')).toBeNull()
  })
})

describe('planilla', () => {
  const m = (
    id: string,
    tipo: 'pago' | 'ajuste',
    montoCentavos: number,
    fecha: string,
  ): MovimientoPago => ({
    id,
    tipo,
    montoCentavos,
    formaPago: tipo === 'pago' ? 'efectivo' : null,
    motivo: tipo === 'ajuste' ? 'Motivo' : null,
    fecha,
    numeroRecibo: null,
  })

  it('arma la planilla de su ficha: abonado, saldo anterior y saldo actual', () => {
    // Su ejemplo: 6500 Bs, cuota inicial de 1000 y cuotas de 400.
    const { filas, saldo, pagado } = planillaDePagos(650000, [
      m('inicial', 'pago', 100000, '2026-01-10'),
      m('cuota2', 'pago', 40000, '2026-03-10'),
      m('cuota1', 'pago', 40000, '2026-02-10'),
      m('ajuste', 'ajuste', 50000, '2026-03-10'),
    ])
    expect(filas.map((f) => [f.movimiento.id, f.saldoAnterior, f.saldoActual])).toEqual([
      ['inicial', 650000, 550000],
      ['cuota1', 550000, 510000],
      ['cuota2', 510000, 470000],
      ['ajuste', 470000, 520000],
    ])
    expect(saldo).toBe(520000)
    expect(pagado).toBe(180000)
  })

  it('propone la cuota inicial y después la sugerida, sin pasar del saldo', () => {
    const p = { cuotaInicialCentavos: 100000, cuotaSugeridaCentavos: 40000 }
    expect(montoSugerido(p, 650000, false)).toBe(100000)
    expect(montoSugerido(p, 550000, true)).toBe(40000)
    expect(montoSugerido(p, 30000, true)).toBe(30000)
    expect(montoSugerido(p, 0, true)).toBeNull()
    expect(
      montoSugerido({ cuotaInicialCentavos: null, cuotaSugeridaCentavos: null }, 80000, false),
    ).toBe(80000)
  })
})

describe('validaciones', () => {
  const id = '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'
  const otro = '6b1f2d3e-4c5a-4b6c-9d7e-8f9a0b1c2d3e'

  it('la cuota inicial no supera el total', () => {
    const r = DatosPresupuesto.safeParse({
      id,
      pacienteId: otro,
      descripcion: 'Ortodoncia',
      totalCentavos: 100000,
      cuotaInicialCentavos: 200000,
      cuotaSugeridaCentavos: null,
      fecha: '2026-01-10',
    })
    expect(r.error?.issues[0]?.message).toBe('La cuota inicial no puede ser mayor que el total.')
  })

  it('un pago lleva monto y forma de pago; un ajuste, motivo', () => {
    const pago = {
      id,
      presupuestoId: otro,
      montoCentavos: 40000,
      formaPago: 'qr',
      fecha: '2026-01-10',
    }
    expect(DatosPago.safeParse(pago).success).toBe(true)
    expect(DatosPago.safeParse({ ...pago, formaPago: '' }).error?.issues[0]?.message).toBe(
      'Elige cómo pagó.',
    )
    expect(
      DatosAjuste.safeParse({
        id,
        presupuestoId: otro,
        montoCentavos: -20000,
        motivo: ' ',
        fecha: '2026-01-10',
      }).error?.issues[0]?.message,
    ).toBe('Escribe el motivo.')
  })
})

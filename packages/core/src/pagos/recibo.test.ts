import { describe, expect, it } from 'vitest'
import {
  filasDelRecibo,
  mensajeRecibo,
  montoEnLetras,
  nombreArchivoRecibo,
  numeroEnLetras,
  type DatosRecibo,
} from './recibo'

describe('monto en letras', () => {
  it('escribe los números como en un recibo', () => {
    const casos: [number, string][] = [
      [0, 'cero'],
      [1, 'uno'],
      [15, 'quince'],
      [21, 'veintiuno'],
      [22, 'veintidós'],
      [30, 'treinta'],
      [45, 'cuarenta y cinco'],
      [100, 'cien'],
      [101, 'ciento uno'],
      [400, 'cuatrocientos'],
      [555, 'quinientos cincuenta y cinco'],
      [1000, 'mil'],
      [1001, 'mil uno'],
      [5500, 'cinco mil quinientos'],
      [21000, 'veintiún mil'],
      [31000, 'treinta y un mil'],
      [100000, 'cien mil'],
      [1000000, 'un millón'],
      [2500000, 'dos millones quinientos mil'],
    ]
    for (const [n, texto] of casos) expect(numeroEnLetras(n), String(n)).toBe(texto)
  })

  it('agrega los centavos y la moneda', () => {
    expect(montoEnLetras(40000)).toBe('cuatrocientos 00/100 bolivianos')
    expect(montoEnLetras(100050)).toBe('mil 50/100 bolivianos')
  })
})

describe('recibo', () => {
  const recibo: DatosRecibo = {
    consultorio: 'Consultorio Sifel',
    numero: 6,
    fecha: '2026-11-22',
    paciente: 'Jorge Quispe',
    montoCentavos: 40000,
    formaPago: 'qr',
    concepto: 'Ortodoncia',
    saldoAnteriorCentavos: 420000,
    saldoActualCentavos: 380000,
    profesional: 'Dra. Laura Méndez',
  }

  it('tiene lo de un recibo de papel', () => {
    expect(Object.fromEntries(filasDelRecibo(recibo))).toEqual({
      Fecha: '22/11/2026',
      'Recibí de': 'Jorge Quispe',
      'La suma de': 'Bs 400',
      Son: 'cuatrocientos 00/100 bolivianos',
      Concepto: 'Ortodoncia',
      'Forma de pago': 'QR',
      'Saldo anterior': 'Bs 4.200',
      'Saldo actual': 'Bs 3.800',
      Atendió: 'Dra. Laura Méndez',
    })
    expect(nombreArchivoRecibo(6)).toBe('recibo-0006.pdf')
  })

  it('arma el mensaje de WhatsApp', () => {
    expect(mensajeRecibo(recibo)).toBe(
      'Hola, Jorge. Te envío el recibo N.º 0006 de Consultorio Sifel: recibimos Bs 400 (QR) ' +
        'el 22/11/2026 por ortodoncia. Te queda un saldo de Bs 3.800. ¡Gracias!',
    )
    expect(mensajeRecibo({ ...recibo, saldoActualCentavos: 0 })).toContain(
      '¡Con esto queda todo pagado!',
    )
  })
})

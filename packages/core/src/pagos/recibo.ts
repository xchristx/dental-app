import { formatearFechaNumerica } from '../historia/historia'
import { NOMBRE_FORMA_PAGO, formatearMonto, type FormaPago } from './pagos'

// Recibo por WhatsApp, sin firma (decisión 0028).

const UNIDADES = [
  'cero',
  'uno',
  'dos',
  'tres',
  'cuatro',
  'cinco',
  'seis',
  'siete',
  'ocho',
  'nueve',
  'diez',
  'once',
  'doce',
  'trece',
  'catorce',
  'quince',
  'dieciséis',
  'diecisiete',
  'dieciocho',
  'diecinueve',
  'veinte',
  'veintiuno',
  'veintidós',
  'veintitrés',
  'veinticuatro',
  'veinticinco',
  'veintiséis',
  'veintisiete',
  'veintiocho',
  'veintinueve',
]
const DECENAS = [
  '',
  '',
  '',
  'treinta',
  'cuarenta',
  'cincuenta',
  'sesenta',
  'setenta',
  'ochenta',
  'noventa',
]
const CENTENAS = [
  '',
  'ciento',
  'doscientos',
  'trescientos',
  'cuatrocientos',
  'quinientos',
  'seiscientos',
  'setecientos',
  'ochocientos',
  'novecientos',
]

/** 0 a 999 en letras. */
function hastaMil(n: number): string {
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100)
  const resto = n % 100
  const decenas =
    resto < 30
      ? UNIDADES[resto]
      : `${DECENAS[Math.floor(resto / 10)]}${resto % 10 ? ` y ${UNIDADES[resto % 10]}` : ''}`
  if (c === 0) return decenas ?? ''
  return resto ? `${CENTENAS[c]} ${decenas}` : (CENTENAS[c] ?? '')
}

/** "uno" y "veintiuno" pierden la última letra antes de "mil" y "millón(es)". */
const apocope = (texto: string) =>
  texto.replace(/veintiuno$/, 'veintiún').replace(/(^|\s)uno$/, '$1un')

/** Un número entero (hasta 999.999.999) en letras, como en un recibo boliviano. */
export function numeroEnLetras(n: number): string {
  if (n === 0) return 'cero'
  const millones = Math.floor(n / 1_000_000)
  const miles = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (millones)
    partes.push(millones === 1 ? 'un millón' : `${apocope(hastaMil(millones))} millones`)
  if (miles) partes.push(miles === 1 ? 'mil' : `${apocope(hastaMil(miles))} mil`)
  if (resto) partes.push(hastaMil(resto))
  return partes.join(' ')
}

/** "cuatrocientos 00/100 bolivianos". */
export function montoEnLetras(centavos: number): string {
  const enteros = Math.floor(Math.abs(centavos) / 100)
  const resto = Math.abs(centavos) % 100
  return `${numeroEnLetras(enteros)} ${String(resto).padStart(2, '0')}/100 bolivianos`
}

/** "N.º 0006". */
export const numeroDeRecibo = (numero: number) => `N.º ${String(numero).padStart(4, '0')}`

export interface DatosRecibo {
  consultorio: string
  numero: number
  fecha: string
  paciente: string
  montoCentavos: number
  formaPago: FormaPago
  concepto: string
  saldoAnteriorCentavos: number
  saldoActualCentavos: number
  profesional: string | null
}

/** Las filas del recibo, para el PDF y la vista previa: [etiqueta, valor]. */
export function filasDelRecibo(d: DatosRecibo): [string, string][] {
  return [
    ['Fecha', formatearFechaNumerica(d.fecha)],
    ['Recibí de', d.paciente],
    ['La suma de', formatearMonto(d.montoCentavos)],
    ['Son', montoEnLetras(d.montoCentavos)],
    ['Concepto', d.concepto],
    ['Forma de pago', NOMBRE_FORMA_PAGO[d.formaPago]],
    ['Saldo anterior', formatearMonto(d.saldoAnteriorCentavos)],
    ['Saldo actual', formatearMonto(d.saldoActualCentavos)],
    ...(d.profesional ? [['Atendió', d.profesional] as [string, string]] : []),
  ]
}

/** El texto que acompaña al recibo en WhatsApp, en español neutro con "tú". */
export function mensajeRecibo(d: DatosRecibo): string {
  const primerNombre = d.paciente.trim().split(/\s+/)[0] ?? d.paciente
  const saldo =
    d.saldoActualCentavos > 0
      ? `Te queda un saldo de ${formatearMonto(d.saldoActualCentavos)}.`
      : '¡Con esto queda todo pagado!'
  return (
    `Hola, ${primerNombre}. Te envío el recibo ${numeroDeRecibo(d.numero)} de ${d.consultorio}: ` +
    `recibimos ${formatearMonto(d.montoCentavos)} (${d.formaPago === 'qr' ? 'QR' : NOMBRE_FORMA_PAGO[d.formaPago].toLowerCase()}) ` +
    `el ${formatearFechaNumerica(d.fecha)} por ${d.concepto.toLowerCase()}. ${saldo} ¡Gracias!`
  )
}

/** "recibo-0006.pdf". */
export const nombreArchivoRecibo = (numero: number) =>
  `recibo-${String(numero).padStart(4, '0')}.pdf`

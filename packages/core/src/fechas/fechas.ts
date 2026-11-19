/**
 * Fechas de calendario ("2026-11-19") y su relación con instantes en una zona
 * horaria. Las fechas se guardan como timestamptz y se muestran en la zona de
 * la organización (por ahora, siempre America/La_Paz).
 */

export const ZONA_LA_PAZ = 'America/La_Paz'

/** Fecha de calendario en formato YYYY-MM-DD, sin hora ni zona. */
export type Fecha = string

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

export function esFechaValida(valor: unknown): valor is Fecha {
  if (typeof valor !== 'string' || !FORMATO_FECHA.test(valor)) return false
  const fecha = new Date(`${valor}T00:00:00Z`)
  // Descarta fechas que no existen, como 2026-02-30.
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
}

/** Fecha local de un instante en la zona: qué día es "allá". */
export function fechaEnZona(instante: Date, zona: string): Fecha {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante)
}

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  const d = new Date(`${fecha}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Lunes de la semana que contiene la fecha. Las semanas van de lunes a domingo. */
export function lunesDeLaSemana(fecha: Fecha): Fecha {
  const diaSemana = new Date(`${fecha}T00:00:00Z`).getUTCDay() // 0 = domingo
  return sumarDias(fecha, -((diaSemana + 6) % 7))
}

export function diasDeLaSemana(lunes: Fecha): Fecha[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

/** Minutos que la hora local de la zona va adelantada respecto de UTC (La Paz: -240). */
function desfaseMinutos(instante: Date, zona: string): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante)
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find((p) => p.type === tipo)?.value ?? 0)

  const comoSiFueraUtc = Date.UTC(
    parte('year'),
    parte('month') - 1,
    parte('day'),
    parte('hour'),
    parte('minute'),
    parte('second'),
  )
  return Math.round((comoSiFueraUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60_000)
}

/** Instante en que empieza el día (00:00 local) en la zona. */
export function inicioDelDia(fecha: Fecha, zona: string): Date {
  const medianocheUtc = Date.parse(`${fecha}T00:00:00Z`)
  const desfase = desfaseMinutos(new Date(medianocheUtc), zona)
  const instante = new Date(medianocheUtc - desfase * 60_000)
  // Si ese día cambia el horario (zonas con horario de verano), se corrige.
  const desfaseReal = desfaseMinutos(instante, zona)
  return desfaseReal === desfase ? instante : new Date(medianocheUtc - desfaseReal * 60_000)
}

/** Rango [desde, hasta) de instantes que cubre la semana del lunes dado. */
export function rangoDeLaSemana(lunes: Fecha, zona: string): { desde: Date; hasta: Date } {
  return { desde: inicioDelDia(lunes, zona), hasta: inicioDelDia(sumarDias(lunes, 7), zona) }
}

/** "10:00", en 24 horas. */
export function formatearHora(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: zona,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante)
}

// Nombres fijos en español: no dependen de cómo traiga los datos de idioma
// cada navegador o servidor ("mié." vs "mié").
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

function partesDeFecha(fecha: Fecha) {
  const d = new Date(`${fecha}T00:00:00Z`)
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth(),
    dia: d.getUTCDate(),
    diaSemana: d.getUTCDay(),
  }
}

/** "Jueves 19 de noviembre" */
export function formatearDiaLargo(fecha: Fecha): string {
  const { mes, dia, diaSemana } = partesDeFecha(fecha)
  const nombre = DIAS[diaSemana]!
  return `${nombre[0]!.toUpperCase()}${nombre.slice(1)} ${dia} de ${MESES[mes]}`
}

/** { nombre: "Jue", numero: 19 } para el encabezado de la semana. */
export function diaCorto(fecha: Fecha): { nombre: string; numero: number } {
  const { dia, diaSemana } = partesDeFecha(fecha)
  return { nombre: DIAS_CORTOS[diaSemana]!, numero: dia }
}

/**
 * "16 – 22 de noviembre", "30 de noviembre – 6 de diciembre" o, si cambia el
 * año, "29 de diciembre de 2025 – 4 de enero de 2026".
 */
export function formatearRangoSemana(lunes: Fecha): string {
  const a = partesDeFecha(lunes)
  const b = partesDeFecha(sumarDias(lunes, 6))
  if (a.anio !== b.anio) {
    return `${a.dia} de ${MESES[a.mes]} de ${a.anio} – ${b.dia} de ${MESES[b.mes]} de ${b.anio}`
  }
  if (a.mes !== b.mes) return `${a.dia} de ${MESES[a.mes]} – ${b.dia} de ${MESES[b.mes]}`
  return `${a.dia} – ${b.dia} de ${MESES[b.mes]}`
}

// Fechas relativas a hoy en La Paz, para que las pruebas no dependan del día
// en que se corren. El seed ubica sus citas en la semana actual (lunes a
// domingo), así que dia(1) es el martes del seed, dia(8) el martes siguiente
// y dia(-6) el martes anterior.
import {
  ZONA_LA_PAZ,
  fechaEnZona,
  formatearDiaLargo,
  formatearRangoSemana,
  lunesDeLaSemana,
  sumarDias,
  type Fecha,
} from '@dental/core'

export { formatearDiaLargo as diaLargo, formatearRangoSemana as rangoSemana, sumarDias }

export const hoy = (): Fecha => fechaEnZona(new Date(), ZONA_LA_PAZ)

/** Día `n` contado desde el lunes de esta semana: 0 lunes … 6 domingo. */
export const dia = (n: number): Fecha => sumarDias(lunesDeLaSemana(hoy()), n)

/** "martes 17 de noviembre", como va dentro de una frase. */
export const diaEnFrase = (fecha: Fecha) => {
  const texto = formatearDiaLargo(fecha)
  return texto[0].toLowerCase() + texto.slice(1)
}

/** Hora local de La Paz, "09:05". */
export const horaLocal = (instante: Date) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: ZONA_LA_PAZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante)

/** Minutos desde la medianoche en La Paz. */
export const minutosDelDia = (instante = new Date()) => {
  const [h, m] = horaLocal(instante).split(':').map(Number)
  return h * 60 + m
}

/** Años cumplidos en `fecha`. */
export const edad = (nacimiento: Fecha, fecha: Fecha = hoy()) => {
  const [an, mn, dn] = nacimiento.split('-').map(Number)
  const [a, m, d] = fecha.split('-').map(Number)
  return a - an - (m < mn || (m === mn && d < dn) ? 1 : 0)
}

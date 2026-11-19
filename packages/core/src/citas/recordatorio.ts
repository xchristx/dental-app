import { formatearDiaLargo, formatearHora, fechaEnZona } from '../fechas/fechas'

/**
 * Número en formato internacional, solo dígitos, como lo pide wa.me.
 * Pensado para Bolivia (+591): un celular de 8 dígitos que empieza con 6 o 7
 * recibe el código del país. Devuelve null si no parece un número válido.
 */
export function telefonoParaWhatsApp(telefono: string | null | undefined): string | null {
  if (!telefono) return null
  let digitos = telefono.replace(/\D/g, '')
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (/^[67]\d{7}$/.test(digitos)) return `591${digitos}`
  // Ya trae el código del país (10 a 15 dígitos en total).
  if (/^[1-9]\d{9,14}$/.test(digitos)) return digitos
  return null
}

export interface DatosRecordatorio {
  paciente: string
  tipo: string | null
  lugar: string
  inicio: Date
  zona: string
}

/**
 * Texto del recordatorio, en español neutro y con "tú" (CLAUDE.md).
 * "Hola, Lucía. Te escribo para recordarte tu cita de control el martes 24
 * de noviembre a las 10:00 en Consultorio. ¿Me confirmas si puedes venir? ¡Gracias!"
 */
export function mensajeRecordatorio(d: DatosRecordatorio): string {
  const primerNombre = d.paciente.trim().split(/\s+/)[0] ?? d.paciente
  const dia = formatearDiaLargo(fechaEnZona(d.inicio, d.zona))
  const diaEnMinuscula = dia[0]!.toLowerCase() + dia.slice(1)
  const tipo = d.tipo ? ` de ${d.tipo.toLowerCase()}` : ''
  return (
    `Hola, ${primerNombre}. Te escribo para recordarte tu cita${tipo} el ${diaEnMinuscula} ` +
    `a las ${formatearHora(d.inicio, d.zona)} en ${d.lugar}. ¿Me confirmas si puedes venir? ¡Gracias!`
  )
}

/** Enlace que abre WhatsApp con el mensaje ya escrito. null si no hay teléfono válido. */
export function enlaceWhatsApp(
  telefono: string | null | undefined,
  mensaje: string,
): string | null {
  const numero = telefonoParaWhatsApp(telefono)
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : null
}

/**
 * Aviso al siguiente paciente cuando la cita anterior se atrasa (0013).
 * Los minutos se redondean hacia arriba de a 5: "unos 10 minutos".
 * "Hola, Jorge. Te escribo para avisarte que tu cita de hoy a las 11:15 va a
 * empezar unos 10 minutos tarde. Disculpa la espera."
 */
export function mensajeRetraso(d: {
  paciente: string
  inicio: Date
  minutos: number
  zona: string
}): string {
  const primerNombre = d.paciente.trim().split(/\s+/)[0] ?? d.paciente
  const minutos = Math.max(5, Math.ceil(d.minutos / 5) * 5)
  return (
    `Hola, ${primerNombre}. Te escribo para avisarte que tu cita de hoy a las ` +
    `${formatearHora(d.inicio, d.zona)} va a empezar unos ${minutos} minutos tarde. Disculpa la espera.`
  )
}

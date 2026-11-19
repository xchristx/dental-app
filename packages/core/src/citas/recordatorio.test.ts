import { describe, expect, it } from 'vitest'
import { ZONA_LA_PAZ } from '../fechas/fechas'
import {
  enlaceWhatsApp,
  mensajeRecordatorio,
  mensajeRetraso,
  telefonoParaWhatsApp,
} from './recordatorio'

// Números inventados.
describe('telefonoParaWhatsApp', () => {
  it('agrega +591 a un celular boliviano de 8 dígitos', () => {
    expect(telefonoParaWhatsApp('71234567')).toBe('59171234567')
    expect(telefonoParaWhatsApp('7 123-4567')).toBe('59171234567')
    expect(telefonoParaWhatsApp('61234567')).toBe('59161234567')
  })

  it('respeta un número que ya trae el código del país', () => {
    expect(telefonoParaWhatsApp('+591 71234567')).toBe('59171234567')
    expect(telefonoParaWhatsApp('0059171234567')).toBe('59171234567')
    expect(telefonoParaWhatsApp('+54 9 11 1234 5678')).toBe('5491112345678')
  })

  it('rechaza números incompletos o vacíos', () => {
    expect(telefonoParaWhatsApp('2123456')).toBeNull() // fijo sin código de área
    expect(telefonoParaWhatsApp('123')).toBeNull()
    expect(telefonoParaWhatsApp('')).toBeNull()
    expect(telefonoParaWhatsApp(null)).toBeNull()
  })
})

describe('mensajeRecordatorio', () => {
  const datos = {
    paciente: 'Lucía Fernández',
    tipo: 'Control',
    lugar: 'Consultorio',
    inicio: new Date('2026-11-24T14:00:00Z'),
    zona: ZONA_LA_PAZ,
  }

  it('usa el primer nombre, el día y la hora de La Paz', () => {
    expect(mensajeRecordatorio(datos)).toBe(
      'Hola, Lucía. Te escribo para recordarte tu cita de control el martes 24 de noviembre a las 10:00 en Consultorio. ¿Me confirmas si puedes venir? ¡Gracias!',
    )
  })

  it('sin tipo de cita, no lo menciona', () => {
    expect(mensajeRecordatorio({ ...datos, tipo: null })).toContain('recordarte tu cita el martes')
  })

  it('arma el enlace de WhatsApp con el texto codificado', () => {
    const enlace = enlaceWhatsApp('71234567', 'Hola, Lucía. ¿Vienes?')
    expect(enlace).toBe('https://wa.me/59171234567?text=Hola%2C%20Luc%C3%ADa.%20%C2%BFVienes%3F')
    expect(enlaceWhatsApp(null, 'Hola')).toBeNull()
  })
})

describe('mensajeRetraso', () => {
  it('avisa con el primer nombre y los minutos redondeados de a 5', () => {
    expect(
      mensajeRetraso({
        paciente: 'Jorge Mamani',
        inicio: new Date('2026-11-24T15:15:00Z'),
        minutos: 8,
        zona: ZONA_LA_PAZ,
      }),
    ).toBe(
      'Hola, Jorge. Te escribo para avisarte que tu cita de hoy a las 11:15 va a empezar unos 10 minutos tarde. Disculpa la espera.',
    )
  })

  it('nunca dice menos de 5 minutos', () => {
    expect(
      mensajeRetraso({ paciente: 'Ana', inicio: new Date(), minutos: 1, zona: ZONA_LA_PAZ }),
    ).toContain('unos 5 minutos')
  })
})

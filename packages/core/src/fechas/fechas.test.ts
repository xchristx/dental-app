import { describe, expect, it } from 'vitest'
import {
  ZONA_LA_PAZ,
  diaCorto,
  diasDeLaSemana,
  esFechaValida,
  fechaEnZona,
  formatearDiaLargo,
  formatearHora,
  formatearRangoSemana,
  inicioDelDia,
  lunesDeLaSemana,
  rangoDeLaSemana,
  sumarDias,
} from './fechas'

describe('esFechaValida', () => {
  it('acepta fechas que existen', () => {
    expect(esFechaValida('2026-11-19')).toBe(true)
    expect(esFechaValida('2028-02-29')).toBe(true)
  })

  it('rechaza formatos raros y fechas que no existen', () => {
    expect(esFechaValida('2026-02-30')).toBe(false)
    expect(esFechaValida('19/11/2026')).toBe(false)
    expect(esFechaValida('2026-11-19T10:00')).toBe(false)
    expect(esFechaValida(undefined)).toBe(false)
  })
})

describe('semanas', () => {
  it('la semana empieza el lunes', () => {
    expect(lunesDeLaSemana('2026-11-19')).toBe('2026-11-16') // jueves
    expect(lunesDeLaSemana('2026-11-16')).toBe('2026-11-16') // lunes
    expect(lunesDeLaSemana('2026-11-22')).toBe('2026-11-16') // domingo
  })

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01')
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('devuelve los siete días de lunes a domingo', () => {
    expect(diasDeLaSemana('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ])
  })
})

describe('zona horaria de La Paz (UTC-4, sin horario de verano)', () => {
  it('el día empieza a las 04:00 UTC', () => {
    expect(inicioDelDia('2026-11-19', ZONA_LA_PAZ).toISOString()).toBe('2026-11-19T04:00:00.000Z')
  })

  it('la semana cubre de lunes 00:00 a lunes siguiente 00:00, hora local', () => {
    const { desde, hasta } = rangoDeLaSemana('2026-11-16', ZONA_LA_PAZ)
    expect(desde.toISOString()).toBe('2026-11-16T04:00:00.000Z')
    expect(hasta.toISOString()).toBe('2026-11-23T04:00:00.000Z')
  })

  it('una cita a las 23:30 en La Paz es de ese día, aunque en UTC ya sea el siguiente', () => {
    expect(fechaEnZona(new Date('2026-11-20T03:30:00Z'), ZONA_LA_PAZ)).toBe('2026-11-19')
  })

  it('muestra la hora local en 24 horas', () => {
    expect(formatearHora(new Date('2026-11-19T14:00:00Z'), ZONA_LA_PAZ)).toBe('10:00')
    expect(formatearHora(new Date('2026-11-19T22:15:00Z'), ZONA_LA_PAZ)).toBe('18:15')
  })

  it('funciona también en zonas con horario de verano', () => {
    // Santiago de Chile pasa a UTC-3 en septiembre; el 7 de septiembre de 2025 empezó a las 01:00.
    expect(inicioDelDia('2025-07-01', 'America/Santiago').toISOString()).toBe(
      '2025-07-01T04:00:00.000Z',
    )
    expect(inicioDelDia('2025-12-01', 'America/Santiago').toISOString()).toBe(
      '2025-12-01T03:00:00.000Z',
    )
  })
})

describe('textos', () => {
  it('formatea el día largo con mayúscula inicial', () => {
    expect(formatearDiaLargo('2026-11-19')).toBe('Jueves 19 de noviembre')
    expect(formatearDiaLargo('2026-11-25')).toBe('Miércoles 25 de noviembre')
  })

  it('da el nombre corto y el número del día', () => {
    expect(diaCorto('2026-11-21')).toEqual({ nombre: 'Sáb', numero: 21 })
  })

  it('formatea el rango de la semana', () => {
    expect(formatearRangoSemana('2026-11-16')).toBe('16 – 22 de noviembre')
    expect(formatearRangoSemana('2026-11-30')).toBe('30 de noviembre – 6 de diciembre')
    expect(formatearRangoSemana('2025-12-29')).toBe('29 de diciembre de 2025 – 4 de enero de 2026')
  })
})

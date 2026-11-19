import { describe, expect, it } from 'vitest'
import { calcularLlegada, formatearLlegada } from './llegada'

// 10:00 en La Paz (UTC-4)
const inicio = new Date('2026-11-24T14:00:00Z')
const a = (iso: string) => new Date(iso)

describe('calcularLlegada', () => {
  it('considera a tiempo dentro de la tolerancia, en ambos sentidos', () => {
    expect(calcularLlegada(inicio, a('2026-11-24T14:05:00Z'))).toEqual({ tipo: 'a_tiempo' })
    expect(calcularLlegada(inicio, a('2026-11-24T13:55:00Z'))).toEqual({ tipo: 'a_tiempo' })
  })

  it('detecta llegadas tarde', () => {
    expect(calcularLlegada(inicio, a('2026-11-24T14:25:00Z'))).toEqual({
      tipo: 'tarde',
      minutos: 25,
    })
  })

  it('detecta llegadas temprano con minutos positivos', () => {
    expect(calcularLlegada(inicio, a('2026-11-24T13:20:00Z'))).toEqual({
      tipo: 'temprano',
      minutos: 40,
    })
  })

  it('respeta una tolerancia distinta', () => {
    expect(calcularLlegada(inicio, a('2026-11-24T14:08:00Z'), 10)).toEqual({ tipo: 'a_tiempo' })
  })
})

describe('formatearLlegada', () => {
  it('usa minutos, horas o ambos', () => {
    expect(formatearLlegada({ tipo: 'tarde', minutos: 25 })).toBe('Llegó 25 min tarde')
    expect(formatearLlegada({ tipo: 'temprano', minutos: 60 })).toBe('Llegó 1 h antes')
    expect(formatearLlegada({ tipo: 'tarde', minutos: 70 })).toBe('Llegó 1 h 10 min tarde')
    expect(formatearLlegada({ tipo: 'a_tiempo' })).toBe('Llegó a tiempo')
  })
})

import { describe, expect, it } from 'vitest'
import { ZONA_LA_PAZ } from '../fechas/fechas'
import {
  estadosSiguientes,
  motivoPorHora,
  puedeCambiarA,
  puedeEnviarRecordatorio,
} from './transiciones'

// Cita el martes 24 a las 10:00 en La Paz (14:00 UTC).
const inicio = new Date('2026-11-24T14:00:00Z')
const momento = (ahora: string) => ({ inicio, ahora: new Date(ahora), zona: ZONA_LA_PAZ })
const diaAntes = momento('2026-11-23T20:00:00Z') // lunes 23, 16:00
const mismoDiaAntes = momento('2026-11-24T13:20:00Z') // martes 24, 09:20
const yaEmpezo = momento('2026-11-24T14:30:00Z') // martes 24, 10:30
const diaDespues = momento('2026-11-25T14:00:00Z') // miércoles 25

describe('estadosSiguientes', () => {
  it('el día anterior solo se confirma o se cancela', () => {
    expect(estadosSiguientes('agendada', false, diaAntes)).toEqual(['confirmada', 'cancelada'])
  })

  it('el mismo día, antes de la hora, ya puede llegar (llegan antes) pero no faltar', () => {
    expect(estadosSiguientes('agendada', false, mismoDiaAntes)).toEqual([
      'confirmada',
      'atendida',
      'cancelada',
    ])
  })

  it('desde la hora de la cita ya no se confirma, y puede marcarse que no asistió', () => {
    expect(estadosSiguientes('agendada', false, yaEmpezo)).toEqual([
      'atendida',
      'no_asistio',
      'cancelada',
    ])
    expect(estadosSiguientes('confirmada', false, diaDespues)).toEqual([
      'agendada',
      'atendida',
      'no_asistio',
      'cancelada',
    ])
  })

  it('una confirmada puede volver a agendada antes de la cita', () => {
    expect(estadosSiguientes('confirmada', false, diaAntes)).toEqual(['agendada', 'cancelada'])
  })

  it('los estados finales solo vuelven a agendada (deshacer), a cualquier hora', () => {
    for (const m of [diaAntes, diaDespues]) {
      expect(estadosSiguientes('atendida', false, m)).toEqual(['agendada'])
      expect(estadosSiguientes('no_asistio', false, m)).toEqual(['agendada'])
      expect(estadosSiguientes('cancelada', false, m)).toEqual(['agendada'])
    }
  })

  it('un bloqueo solo se cancela o se vuelve a activar', () => {
    expect(estadosSiguientes('agendada', true, yaEmpezo)).toEqual(['cancelada'])
    expect(estadosSiguientes('cancelada', true, yaEmpezo)).toEqual(['agendada'])
    expect(puedeCambiarA('agendada', 'atendida', true, yaEmpezo)).toBe(false)
  })

  it('puedeCambiarA aplica las mismas reglas de tiempo', () => {
    expect(puedeCambiarA('agendada', 'no_asistio', false, diaAntes)).toBe(false)
    expect(puedeCambiarA('agendada', 'atendida', false, diaAntes)).toBe(false)
    expect(puedeCambiarA('agendada', 'no_asistio', false, yaEmpezo)).toBe(true)
  })
})

describe('puedeEnviarRecordatorio', () => {
  it('solo antes de la cita y si sigue activa', () => {
    expect(puedeEnviarRecordatorio('agendada', inicio, diaAntes.ahora)).toBe(true)
    expect(puedeEnviarRecordatorio('confirmada', inicio, mismoDiaAntes.ahora)).toBe(true)
    expect(puedeEnviarRecordatorio('agendada', inicio, yaEmpezo.ahora)).toBe(false)
    expect(puedeEnviarRecordatorio('cancelada', inicio, diaAntes.ahora)).toBe(false)
  })
})

describe('motivoPorHora', () => {
  it('explica por qué no se puede a esa hora', () => {
    expect(motivoPorHora('atendida', diaAntes)).toBe('Todavía no es el día de la cita.')
    expect(motivoPorHora('no_asistio', mismoDiaAntes)).toBe('La cita todavía no empieza.')
    expect(motivoPorHora('confirmada', yaEmpezo)).toBe(
      'La cita ya empezó: ya no hace falta confirmarla.',
    )
    expect(motivoPorHora('cancelada', diaDespues)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { ReagendarCita, estadoAlReagendar, puedeReagendar } from './reagendar'

describe('puedeReagendar', () => {
  it('se reagendan las citas con paciente que no se atendieron', () => {
    for (const estado of ['agendada', 'confirmada', 'no_asistio', 'cancelada'] as const) {
      expect(puedeReagendar({ estado, esBloqueo: false }, false)).toBe(true)
    }
  })

  it('una atendida no se reagenda', () => {
    expect(puedeReagendar({ estado: 'atendida', esBloqueo: false }, false)).toBe(false)
  })

  it('un bloqueo no se reagenda', () => {
    expect(puedeReagendar({ estado: 'agendada', esBloqueo: true }, false)).toBe(false)
  })

  it('una cita ya reagendada no se reagenda otra vez', () => {
    expect(puedeReagendar({ estado: 'cancelada', esBloqueo: false }, true)).toBe(false)
  })
})

describe('estadoAlReagendar', () => {
  const ahora = new Date('2026-11-24T14:00:00Z') // 10:00 en La Paz

  it('si la hora ya pasó, el paciente no vino', () => {
    const inicio = new Date('2026-11-24T13:00:00Z')
    expect(estadoAlReagendar({ estado: 'agendada', inicio }, ahora)).toBe('no_asistio')
    expect(estadoAlReagendar({ estado: 'confirmada', inicio }, ahora)).toBe('no_asistio')
  })

  it('si la hora no llegó, la cita se canceló antes', () => {
    const inicio = new Date('2026-11-25T14:00:00Z')
    expect(estadoAlReagendar({ estado: 'agendada', inicio }, ahora)).toBe('cancelada')
  })

  it('si ya estaba cancelada o como no asistió, queda igual', () => {
    const futura = new Date('2026-11-25T14:00:00Z')
    const pasada = new Date('2026-11-23T14:00:00Z')
    expect(estadoAlReagendar({ estado: 'no_asistio', inicio: futura }, ahora)).toBe('no_asistio')
    expect(estadoAlReagendar({ estado: 'cancelada', inicio: pasada }, ahora)).toBe('cancelada')
  })
})

describe('ReagendarCita', () => {
  const base = {
    citaOriginalId: '1a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    id: '6a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    profesionalId: '2a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    lugarId: '3a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    tipoCitaId: null,
    fecha: '2026-11-26',
    hora: '11:30',
    duracionMin: 60,
    nota: '',
  }

  it('acepta los datos sin paciente', () => {
    const r = ReagendarCita.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.data?.nota).toBeNull()
  })

  it('pide la cita original', () => {
    expect(ReagendarCita.safeParse({ ...base, citaOriginalId: 'x' }).success).toBe(false)
  })

  it('valida la hora igual que una cita nueva', () => {
    const r = ReagendarCita.safeParse({ ...base, hora: '25:00' })
    expect(r.error?.issues[0]?.message).toBe('Elige una hora válida.')
  })
})

import { describe, expect, it } from 'vitest'
import { ZONA_LA_PAZ } from '../fechas/fechas'
import { NuevaCita, rangoDeLaCita } from './nueva-cita'

const base = {
  id: '6a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
  paciente: { tipo: 'existente', id: '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d' },
  profesionalId: '2a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
  lugarId: '3a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
  tipoCitaId: null,
  fecha: '2026-11-24',
  hora: '10:00',
  duracionMin: '60',
  nota: '  ',
}

describe('NuevaCita', () => {
  it('acepta una cita válida y limpia los textos vacíos', () => {
    const r = NuevaCita.safeParse(base)
    expect(r.success).toBe(true)
    expect(r.data?.duracionMin).toBe(60)
    expect(r.data?.nota).toBeNull()
  })

  it('acepta un paciente nuevo con su nombre', () => {
    const r = NuevaCita.safeParse({
      ...base,
      paciente: {
        tipo: 'nuevo',
        id: '7a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
        nombre: ' Ana Pérez ',
        telefono: '',
      },
    })
    expect(r.success).toBe(true)
    expect(r.data?.paciente).toEqual({
      tipo: 'nuevo',
      id: '7a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
      nombre: 'Ana Pérez',
      telefono: null,
    })
  })

  it('acepta un bloqueo sin paciente', () => {
    expect(NuevaCita.safeParse({ ...base, paciente: { tipo: 'bloqueo' } }).success).toBe(true)
  })

  it('rechaza datos inválidos con mensajes en español', () => {
    const r = NuevaCita.safeParse({
      ...base,
      paciente: {
        tipo: 'nuevo',
        id: '7a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
        nombre: 'A',
        telefono: null,
      },
      fecha: '2026-02-30',
      hora: '25:00',
      duracionMin: '2',
    })
    expect(r.success).toBe(false)
    const mensajes = r.error?.issues.map((i) => i.message)
    expect(mensajes).toContain('Escribe el nombre del paciente.')
    expect(mensajes).toContain('Elige una fecha válida.')
    expect(mensajes).toContain('Elige una hora válida.')
    expect(mensajes).toContain('La cita dura al menos 5 minutos.')
  })
})

describe('rangoDeLaCita', () => {
  it('convierte la hora de La Paz a instantes', () => {
    const { inicio, fin } = rangoDeLaCita(
      { fecha: '2026-11-24', hora: '10:00', duracionMin: 90 },
      ZONA_LA_PAZ,
    )
    expect(inicio.toISOString()).toBe('2026-11-24T14:00:00.000Z')
    expect(fin.toISOString()).toBe('2026-11-24T15:30:00.000Z')
  })

  it('una cita a las 22:30 termina al día siguiente en UTC', () => {
    const { fin } = rangoDeLaCita(
      { fecha: '2026-11-24', hora: '22:30', duracionMin: 60 },
      ZONA_LA_PAZ,
    )
    expect(fin.toISOString()).toBe('2026-11-25T03:30:00.000Z')
  })
})

import { describe, expect, it } from 'vitest'
import {
  DatosPaciente,
  coincideBusqueda,
  edad,
  iniciales,
  puntualidad,
  textoPuntualidad,
} from './pacientes'

const ID = '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'

describe('DatosPaciente', () => {
  it('acepta una ficha válida y limpia los campos vacíos', () => {
    const r = DatosPaciente.safeParse({
      id: ID,
      nombre: ' Ana Pérez ',
      telefono: '',
      fechaNacimiento: '',
    })
    expect(r.success).toBe(true)
    expect(r.data).toEqual({ id: ID, nombre: 'Ana Pérez', telefono: null, fechaNacimiento: null })
  })

  it('valida el celular y la fecha (datos inventados)', () => {
    const r = DatosPaciente.safeParse({
      id: ID,
      nombre: 'Ana',
      telefono: '123',
      fechaNacimiento: '2001-02-30',
    })
    const mensajes = r.error?.issues.map((i) => i.message)
    expect(mensajes).toContain(
      'Ese número no parece un celular. Escríbelo con 8 dígitos, por ejemplo 71234567.',
    )
    expect(mensajes).toContain('Elige una fecha válida.')
  })

  it('no acepta una fecha de nacimiento futura', () => {
    const r = DatosPaciente.safeParse({
      id: ID,
      nombre: 'Ana',
      telefono: '',
      fechaNacimiento: '2999-01-01',
    })
    expect(r.error?.issues[0]?.message).toBe('La fecha de nacimiento no puede ser futura.')
  })
})

describe('edad', () => {
  it('cuenta los años cumplidos', () => {
    expect(edad('1990-11-19', '2026-11-19')).toBe(36)
    expect(edad('1990-11-20', '2026-11-19')).toBe(35)
    expect(edad('2015-01-01', '2026-11-19')).toBe(11)
  })

  it('sin fecha o con una fecha futura, no hay edad', () => {
    expect(edad(null, '2026-11-19')).toBeNull()
    expect(edad('2030-01-01', '2026-11-19')).toBeNull()
  })
})

describe('coincideBusqueda', () => {
  it('no distingue tildes ni mayúsculas y acepta partes de varias palabras', () => {
    expect(coincideBusqueda('Lucía Fernández', 'lucia')).toBe(true)
    expect(coincideBusqueda('Lucía Fernández', 'luc fer')).toBe(true)
    expect(coincideBusqueda('Lucía Fernández', 'ana')).toBe(false)
  })
})

describe('puntualidad', () => {
  const cita = (minutos: number | null) => ({
    inicio: new Date('2026-11-01T14:00:00Z'),
    llegada:
      minutos === null ? null : new Date(Date.parse('2026-11-01T14:00:00Z') + minutos * 60_000),
  })

  it('con menos de tres llegadas no dice nada', () => {
    expect(puntualidad([cita(20), cita(25), cita(null)])).toBeNull()
  })

  it('usa la mediana: una vez muy tarde no pesa demasiado', () => {
    expect(puntualidad([cita(20), cita(25), cita(90)])).toEqual({
      llegada: { tipo: 'tarde', minutos: 25 },
      citas: 3,
    })
  })

  it('distingue a quien llega antes o a tiempo', () => {
    expect(puntualidad([cita(-30), cita(-40), cita(-35)])?.llegada).toEqual({
      tipo: 'temprano',
      minutos: 35,
    })
    expect(puntualidad([cita(2), cita(-3), cita(0), cita(4)])?.llegada).toEqual({
      tipo: 'a_tiempo',
    })
  })
})

describe('textoPuntualidad', () => {
  it('describe cómo suele llegar', () => {
    expect(textoPuntualidad({ tipo: 'tarde', minutos: 25 })).toBe('Suele llegar 25 min tarde')
    expect(textoPuntualidad({ tipo: 'temprano', minutos: 70 })).toBe(
      'Suele llegar 1 h 10 min antes',
    )
    expect(textoPuntualidad({ tipo: 'a_tiempo' })).toBe('Suele llegar a tiempo')
  })
})

describe('iniciales', () => {
  it('toma el primer nombre y el primer apellido (datos inventados)', () => {
    expect(iniciales('Lucía Fernández')).toBe('LF')
    expect(iniciales('  mateo  ')).toBe('M')
    expect(iniciales('Ana María Quispe Mamani')).toBe('AQ')
    expect(iniciales('Ángel Ortiz Rojas')).toBe('ÁO')
    expect(iniciales('')).toBe('')
  })
})

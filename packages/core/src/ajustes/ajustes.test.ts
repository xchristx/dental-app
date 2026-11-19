import { describe, expect, it } from 'vitest'
import {
  DatosLugar,
  NuevosTramos,
  comoQuitarTramo,
  diasConSuperposicion,
  listarDias,
} from './ajustes'

const ID = '3a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'
const PROF = '2a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'

describe('DatosLugar', () => {
  it('acepta un lugar válido y limpia la dirección vacía', () => {
    const r = DatosLugar.safeParse({
      id: ID,
      nombre: ' Consultorio ',
      color: 'azul',
      controlaSillon: true,
      direccion: '',
    })
    expect(r.success).toBe(true)
    expect(r.data).toMatchObject({ nombre: 'Consultorio', direccion: null })
  })

  it('rechaza colores que no son de la guía (el rojo es para los choques)', () => {
    const r = DatosLugar.safeParse({
      id: ID,
      nombre: 'X1',
      color: 'rojo',
      controlaSillon: false,
      direccion: null,
    })
    expect(r.success).toBe(false)
  })
})

describe('NuevosTramos', () => {
  const base = {
    profesionalId: PROF,
    lugarId: ID,
    dias: [5, 1, 1, 3],
    horaInicio: '10:00',
    horaFin: '13:00',
  }

  it('ordena los días y quita repetidos', () => {
    expect(NuevosTramos.parse(base).dias).toEqual([1, 3, 5])
  })

  it('exige al menos un día y que el fin sea después del inicio', () => {
    const r = NuevosTramos.safeParse({ ...base, dias: [], horaFin: '09:00' })
    const mensajes = r.error?.issues.map((i) => i.message)
    expect(mensajes).toContain('Elige al menos un día.')
  })

  it('el fin tiene que ser después del inicio', () => {
    const r = NuevosTramos.safeParse({ ...base, horaFin: '10:00' })
    expect(r.error?.issues[0]?.message).toBe(
      'La hora de fin tiene que ser después de la de inicio.',
    )
  })
})

describe('diasConSuperposicion', () => {
  const existentes = [
    { diaSemana: 1, horaInicio: '10:00:00', horaFin: '13:00:00' },
    { diaSemana: 3, horaInicio: '15:00:00', horaFin: '21:00:00' },
  ]

  it('detecta los días en que choca con un tramo existente', () => {
    expect(
      diasConSuperposicion({ dias: [1, 2, 3], horaInicio: '12:00', horaFin: '16:00' }, existentes),
    ).toEqual([1, 3])
  })

  it('permite empezar justo cuando termina otro', () => {
    expect(
      diasConSuperposicion({ dias: [1], horaInicio: '13:00', horaFin: '15:00' }, existentes),
    ).toEqual([])
  })
})

describe('comoQuitarTramo', () => {
  it('un tramo con historia se cierra el día anterior (0004)', () => {
    expect(comoQuitarTramo('2026-01-01', '2026-11-19')).toEqual({
      tipo: 'cerrar',
      vigenteHasta: '2026-11-18',
    })
  })

  it('un tramo creado hoy se borra', () => {
    expect(comoQuitarTramo('2026-11-19', '2026-11-19')).toEqual({ tipo: 'borrar' })
  })
})

describe('listarDias', () => {
  it('une los nombres en español', () => {
    expect(listarDias([1])).toBe('Lunes')
    expect(listarDias([1, 2, 5])).toBe('Lunes, martes y viernes')
  })
})

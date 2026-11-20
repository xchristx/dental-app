import { describe, expect, it } from 'vitest'
import { DatosProfesional, nombreConEspecialidad } from './profesionales'

const ID = '6a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'

describe('DatosProfesional', () => {
  it('limpia los textos y deja la especialidad opcional', () => {
    const r = DatosProfesional.safeParse({ id: ID, nombre: '  Dra. Ana Rojas ', especialidad: ' ' })
    expect(r.data).toEqual({ id: ID, nombre: 'Dra. Ana Rojas', especialidad: null })
  })

  it('pide el nombre', () => {
    const r = DatosProfesional.safeParse({ id: ID, nombre: ' ', especialidad: '' })
    expect(r.error?.issues[0]?.message).toBe('Escribe el nombre de la profesional.')
  })
})

describe('nombreConEspecialidad', () => {
  it('agrega la especialidad si la tiene', () => {
    expect(nombreConEspecialidad({ nombre: 'Dra. Rocío Paz', especialidad: 'Ortodoncia' })).toBe(
      'Dra. Rocío Paz · Ortodoncia',
    )
    expect(nombreConEspecialidad({ nombre: 'Dra. Rocío Paz', especialidad: null })).toBe(
      'Dra. Rocío Paz',
    )
  })
})

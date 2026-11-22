import { describe, expect, it } from 'vitest'
import { ZONA_LA_PAZ, fechaEnZona, sumarDias } from '../fechas/fechas'
import {
  DatosAnamnesis,
  DatosEvolucion,
  evolucionEditable,
  formatearFechaNumerica,
  resumenAlergias,
} from './historia'

const ID = '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d'
const PACIENTE = '6b1f2d3e-4c5a-4b6c-9d7e-8f9a0b1c2d3e'
const USUARIA = '7c2a3e4f-5d6b-4c7d-8e8f-9a0b1c2d3e4f'

describe('DatosAnamnesis', () => {
  const base = {
    id: ID,
    pacienteId: PACIENTE,
    antecedentesPersonales: ' Hipertensión ',
    antecedentesFamiliares: '',
    alergias: '',
    sinAlergias: true,
    medicamentos: '   ',
  }

  it('recorta los textos y deja los vacíos en null', () => {
    const r = DatosAnamnesis.safeParse(base)
    expect(r.data).toEqual({
      ...base,
      antecedentesPersonales: 'Hipertensión',
      antecedentesFamiliares: null,
      alergias: null,
      medicamentos: null,
    })
  })

  it('no acepta "Sin alergias conocidas" con alergias escritas', () => {
    const r = DatosAnamnesis.safeParse({ ...base, alergias: 'Penicilina' })
    expect(r.error?.issues[0]?.message).toBe(
      'Si tiene alergias, desmarca "Sin alergias conocidas".',
    )
  })
})

describe('DatosEvolucion', () => {
  const hoy = fechaEnZona(new Date(), ZONA_LA_PAZ)

  it('acepta una entrada de hoy y recorta el texto', () => {
    const r = DatosEvolucion.safeParse({
      id: ID,
      pacienteId: PACIENTE,
      citaId: null,
      fecha: hoy,
      texto: ' Profilaxis. ',
    })
    expect(r.data?.texto).toBe('Profilaxis.')
  })

  it('pide el texto y no acepta una fecha futura', () => {
    const r = DatosEvolucion.safeParse({
      id: ID,
      pacienteId: PACIENTE,
      citaId: null,
      fecha: sumarDias(hoy, 1),
      texto: '  ',
    })
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      'La fecha no puede ser futura.',
      'Escribe qué se hizo.',
    ])
  })
})

describe('resumenAlergias', () => {
  it('distingue alergias, sin alergias y sin dato', () => {
    expect(resumenAlergias({ alergias: 'Látex', sinAlergias: false })).toEqual({
      tipo: 'alergias',
      texto: 'Látex',
    })
    expect(resumenAlergias({ alergias: null, sinAlergias: true })).toEqual({
      tipo: 'sin_alergias',
    })
    expect(resumenAlergias({ alergias: null, sinAlergias: false })).toEqual({ tipo: 'sin_dato' })
    expect(resumenAlergias(null)).toEqual({ tipo: 'sin_dato' })
  })
})

describe('evolucionEditable', () => {
  // 22/11/2026 23:30 en La Paz (UTC-4) = 23/11 03:30 UTC.
  const creada = new Date('2026-11-23T03:30:00Z')

  it('la edita quien la escribió el mismo día en La Paz', () => {
    expect(
      evolucionEditable(
        { autorId: USUARIA, creadaEn: creada },
        USUARIA,
        new Date('2026-11-23T03:50:00Z'),
      ),
    ).toBe(true)
  })

  it('después de la medianoche de La Paz ya no', () => {
    expect(
      evolucionEditable(
        { autorId: USUARIA, creadaEn: creada },
        USUARIA,
        new Date('2026-11-23T04:05:00Z'),
      ),
    ).toBe(false)
  })

  it('otra persona no la edita', () => {
    expect(evolucionEditable({ autorId: USUARIA, creadaEn: creada }, ID, creada)).toBe(false)
    expect(evolucionEditable({ autorId: null, creadaEn: creada }, null, creada)).toBe(false)
  })
})

describe('formatearFechaNumerica', () => {
  it('muestra día/mes/año', () => {
    expect(formatearFechaNumerica('2026-11-22')).toBe('22/11/2026')
  })
})

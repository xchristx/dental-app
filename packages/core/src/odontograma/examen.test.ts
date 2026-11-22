import { describe, expect, it } from 'vitest'
import { DatosExamenBucal, examenAlDia, textoRespuesta } from './examen'

describe('DatosExamenBucal', () => {
  const base = {
    id: '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    pacienteId: '6b1f2d3e-4c5a-4b6c-9d7e-8f9a0b1c2d3e',
    usaMondadientes: true,
    cepillaLengua: null,
    tartaro: false,
    halitosis: null,
    placaBacteriana: true,
    materiaAlba: null,
    oclusion: ' Mordida abierta ',
    observaciones: '   ',
  }

  it('deja "sin dato" en null y los textos vacíos como null', () => {
    const d = DatosExamenBucal.parse(base)
    expect(d.cepillaLengua).toBeNull()
    expect(d.oclusion).toBe('Mordida abierta')
    expect(d.observaciones).toBeNull()
  })

  it('limita el largo de la oclusión', () => {
    expect(
      DatosExamenBucal.safeParse({ ...base, oclusion: 'x'.repeat(201) }).error?.issues[0]?.message,
    ).toBe('Máximo 200 caracteres.')
  })
})

describe('examen en el tiempo', () => {
  const versiones = [
    { id: 'nueva', fecha: '2026-04-07' },
    { id: 'vieja', fecha: '2026-03-03' },
  ]

  it('un día muestra la versión vigente entonces', () => {
    expect(examenAlDia(versiones, '2026-04-07')?.id).toBe('nueva')
    expect(examenAlDia(versiones, '2026-03-20')?.id).toBe('vieja')
    expect(examenAlDia(versiones, '2026-03-01')).toBeNull()
  })

  it('escribe la respuesta', () => {
    expect([true, false, null].map(textoRespuesta)).toEqual(['Sí', 'No', 'Sin dato'])
  })
})

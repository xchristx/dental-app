import { describe, expect, it } from 'vitest'
import { DatosArchivo, formatearTamano, medidasAchicadas, rutaDeArchivo } from './archivos'

describe('archivos', () => {
  it('guarda cada archivo en la carpeta de su organización y paciente', () => {
    expect(rutaDeArchivo('org', 'pac', 'id', 'image/jpeg')).toBe('org/pac/id.jpg')
    expect(rutaDeArchivo('org', 'pac', 'id', 'application/pdf')).toBe('org/pac/id.pdf')
  })

  it('achica una foto de celular sin deformarla', () => {
    expect(medidasAchicadas(4032, 3024)).toEqual({ ancho: 2000, alto: 1500 })
    expect(medidasAchicadas(3024, 4032)).toEqual({ ancho: 1500, alto: 2000 })
    expect(medidasAchicadas(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })

  it('escribe el tamaño', () => {
    expect(formatearTamano(350 * 1024)).toBe('350 KB')
    expect(formatearTamano(1.25 * 1024 * 1024)).toBe('1,3 MB')
    expect(formatearTamano(10)).toBe('1 KB')
  })

  it('rechaza formatos y tamaños que el bucket no acepta', () => {
    const base = {
      id: '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
      pacienteId: '6b1f2d3e-4c5a-4b6c-9d7e-8f9a0b1c2d3e',
      tipo: 'radiografia',
      mime: 'image/jpeg',
      bytes: 300000,
      nota: '',
      fecha: '2026-01-10',
    }
    expect(DatosArchivo.safeParse(base).data?.nota).toBeNull()
    expect(DatosArchivo.safeParse({ ...base, mime: 'image/heic' }).error?.issues[0]?.message).toBe(
      'Ese formato no se puede subir. Usa una foto (JPG o PNG) o un PDF.',
    )
    expect(
      DatosArchivo.safeParse({ ...base, bytes: 11 * 1024 * 1024 }).error?.issues[0]?.message,
    ).toBe('El archivo pesa más de 10 MB.')
  })
})

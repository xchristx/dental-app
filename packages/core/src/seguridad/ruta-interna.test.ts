import { describe, expect, it } from 'vitest'
import { rutaInternaSegura } from './ruta-interna'

describe('rutaInternaSegura', () => {
  it('acepta rutas internas, con o sin parámetros', () => {
    expect(rutaInternaSegura('/')).toBe('/')
    expect(rutaInternaSegura('/pacientes')).toBe('/pacientes')
    expect(rutaInternaSegura('/pacientes?buscar=ana')).toBe('/pacientes?buscar=ana')
  })

  it('rechaza otros dominios', () => {
    expect(rutaInternaSegura('https://otro-sitio.com')).toBe('/')
    expect(rutaInternaSegura('//otro-sitio.com')).toBe('/')
    expect(rutaInternaSegura('/\\otro-sitio.com')).toBe('/')
  })

  it('rechaza rutas relativas, vacías o con caracteres de control', () => {
    expect(rutaInternaSegura('pacientes')).toBe('/')
    expect(rutaInternaSegura('')).toBe('/')
    expect(rutaInternaSegura('/\t/otro-sitio.com')).toBe('/')
  })

  it('rechaza valores que no son texto', () => {
    expect(rutaInternaSegura(null)).toBe('/')
    expect(rutaInternaSegura(undefined)).toBe('/')
    expect(rutaInternaSegura(['/pacientes'])).toBe('/')
  })
})

import { describe, expect, it } from 'vitest'
import { finSiSeAtiendeCompleta, impactoDeLlegada, type CitaDelDia } from './llegada-tarde'

// Martes 24 en La Paz (UTC-4): "10:00" es 14:00 UTC.
const hora = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number]
  return new Date(Date.UTC(2026, 10, 24, h + 4, m))
}
const LAURA = 'laura'
const ROCIO = 'rocio'
const CONSULTORIO = 'consultorio'
const CLINICA = 'clinica'

const cita = (id: string, desde: string, hasta: string, extra: Partial<CitaDelDia> = {}) => ({
  id,
  profesionalId: LAURA,
  lugarId: CONSULTORIO,
  inicio: hora(desde),
  fin: hora(hasta),
  estado: 'agendada' as const,
  ...extra,
})

// Lucía: 10:00 a 11:00, atendida.
const atendida = (llegada: string | null, extra: { fin?: string; finPrevisto?: string } = {}) => ({
  ...cita('lucia', '10:00', extra.fin ?? '11:00'),
  estado: 'atendida' as const,
  llegada: llegada ? hora(llegada) : null,
  finPrevisto: extra.finPrevisto ? hora(extra.finPrevisto) : null,
})

const contexto = (citas: CitaDelDia[]) => ({
  citas,
  controlaSillon: (lugar: string) => lugar === CONSULTORIO,
  margenTrasladoMin: 30,
})

describe('finSiSeAtiendeCompleta', () => {
  it('suma la duración acordada a la hora de llegada', () => {
    expect(finSiSeAtiendeCompleta({ ...atendida('10:25'), llegada: hora('10:25') })).toEqual(
      hora('11:25'),
    )
  })

  it('si ya se extendió, usa la duración de antes', () => {
    const c = atendida('10:25', { fin: '11:25', finPrevisto: '11:00' })
    expect(finSiSeAtiendeCompleta({ ...c, llegada: hora('10:25') })).toEqual(hora('11:25'))
  })
})

describe('impactoDeLlegada', () => {
  it('a tiempo o temprano no hay nada que avisar', () => {
    expect(impactoDeLlegada(atendida('10:04'), contexto([])).tipo).toBe('sin_impacto')
    expect(impactoDeLlegada(atendida('09:20'), contexto([])).tipo).toBe('sin_impacto')
  })

  it('si no hay nada después, se puede extender', () => {
    expect(impactoDeLlegada(atendida('10:25'), contexto([]))).toEqual({
      tipo: 'se_puede_extender',
      finCompleto: hora('11:25'),
      minutosExtra: 25,
    })
  })

  it('si la siguiente empieza antes de que termine, la atrasa', () => {
    const jorge = cita('jorge', '11:15', '11:30')
    expect(impactoDeLlegada(atendida('10:25'), contexto([jorge]))).toEqual({
      tipo: 'atrasa_siguiente',
      finCompleto: hora('11:25'),
      siguienteId: 'jorge',
      minutosRetraso: 10,
    })
  })

  it('si la siguiente empieza después, se puede extender', () => {
    const jorge = cita('jorge', '11:30', '12:00')
    expect(impactoDeLlegada(atendida('10:25'), contexto([jorge])).tipo).toBe('se_puede_extender')
  })

  it('en otro lugar cuenta el traslado', () => {
    const otra = cita('otra', '11:45', '12:45', { lugarId: CLINICA })
    const r = impactoDeLlegada(atendida('10:25'), contexto([otra]))
    expect(r).toMatchObject({ tipo: 'atrasa_siguiente', siguienteId: 'otra', minutosRetraso: 10 })
  })

  it('cuenta la cita de otra profesional en el mismo sillón, no en la clínica', () => {
    const enMiSillon = cita('rocio', '11:00', '12:00', { profesionalId: ROCIO })
    const enLaClinica = cita('rocio-2', '11:00', '12:00', {
      profesionalId: ROCIO,
      lugarId: CLINICA,
    })
    expect(impactoDeLlegada(atendida('10:25'), contexto([enMiSillon]))).toMatchObject({
      tipo: 'atrasa_siguiente',
      siguienteId: 'rocio',
    })
    expect(impactoDeLlegada(atendida('10:25'), contexto([enLaClinica])).tipo).toBe(
      'se_puede_extender',
    )
  })

  it('las citas canceladas no se atrasan', () => {
    const cancelada = cita('jorge', '11:15', '11:30', { estado: 'cancelada' })
    expect(impactoDeLlegada(atendida('10:25'), contexto([cancelada])).tipo).toBe(
      'se_puede_extender',
    )
  })

  it('una vez extendida, ya no hay nada que avisar', () => {
    const c = atendida('10:25', { fin: '11:25', finPrevisto: '11:00' })
    expect(impactoDeLlegada(c, contexto([])).tipo).toBe('sin_impacto')
  })

  it('si no se marcó la llegada, no hay nada que calcular', () => {
    expect(impactoDeLlegada(atendida(null), contexto([])).tipo).toBe('sin_impacto')
  })
})

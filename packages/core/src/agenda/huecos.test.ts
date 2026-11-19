import { describe, expect, it } from 'vitest'
import { ZONA_LA_PAZ, formatearHora, instanteLocal } from '../fechas/fechas'
import {
  avisosDeCita,
  diaSemanaIso,
  horasSugeridas,
  huecosLibres,
  lugarSugerido,
  tramosDelDia,
  type CitaOcupada,
  type Horario,
} from './huecos'

// Datos inventados, parecidos a los del seed.
const LAURA = 'laura'
const ROCIO = 'rocio'
const CONSULTORIO = 'consultorio'
const CLINICA = 'clinica'
const MARTES = '2026-11-17'

const hora = (h: string, fecha = MARTES) => instanteLocal(fecha, h, ZONA_LA_PAZ)
const ver = (xs: { lugarId: string; inicio: Date; fin: Date }[]) =>
  xs.map(
    (x) =>
      `${x.lugarId} ${formatearHora(x.inicio, ZONA_LA_PAZ)}-${formatearHora(x.fin, ZONA_LA_PAZ)}`,
  )

const horario = (p: Partial<Horario>): Horario => ({
  profesionalId: LAURA,
  lugarId: CONSULTORIO,
  diaSemana: 2,
  horaInicio: '10:00:00',
  horaFin: '13:00:00',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  ...p,
})

const cita = (p: Partial<CitaOcupada> & { desde: string; hasta: string }): CitaOcupada => ({
  profesionalId: LAURA,
  lugarId: CONSULTORIO,
  estado: 'agendada',
  inicio: hora(p.desde),
  fin: hora(p.hasta),
  ...p,
})

// Martes: consultorio de 10 a 13 y clínica de 15 a 18.
const horarios = [
  horario({}),
  horario({ lugarId: CLINICA, horaInicio: '15:00:00', horaFin: '18:00:00' }),
  horario({ profesionalId: ROCIO, diaSemana: 4, horaInicio: '15:00', horaFin: '19:00' }),
]
const lugares = [
  { id: CONSULTORIO, controlaSillon: true },
  { id: CLINICA, controlaSillon: false },
]
const base = {
  fecha: MARTES,
  zona: ZONA_LA_PAZ,
  profesionalId: LAURA,
  margenTrasladoMin: 30,
  horarios,
  lugares,
}

describe('tramosDelDia', () => {
  it('usa el día de la semana ISO', () => {
    expect(diaSemanaIso('2026-11-16')).toBe(1)
    expect(diaSemanaIso('2026-11-22')).toBe(7)
  })

  it('devuelve los tramos de ese día, ordenados', () => {
    expect(ver(tramosDelDia(horarios, LAURA, MARTES, ZONA_LA_PAZ))).toEqual([
      'consultorio 10:00-13:00',
      'clinica 15:00-18:00',
    ])
  })

  it('respeta la vigencia de cada horario', () => {
    const viejo = horario({ vigenteHasta: '2026-11-10' })
    const nuevo = horario({ vigenteDesde: '2026-12-01' })
    expect(tramosDelDia([viejo, nuevo], LAURA, MARTES, ZONA_LA_PAZ)).toEqual([])
  })
})

describe('huecosLibres', () => {
  it('resta sus citas del horario', () => {
    const citas = [
      cita({ desde: '10:00', hasta: '11:00' }),
      cita({ desde: '11:15', hasta: '11:30' }),
      cita({ lugarId: CLINICA, desde: '15:00', hasta: '16:30' }),
    ]
    expect(ver(huecosLibres({ ...base, citas }))).toEqual([
      'consultorio 11:00-11:15',
      'consultorio 11:30-13:00',
      'clinica 16:30-18:00',
    ])
  })

  it('las citas canceladas o de pacientes que no vinieron no ocupan', () => {
    const citas = [
      cita({ desde: '10:00', hasta: '11:00', estado: 'cancelada' }),
      cita({ desde: '11:00', hasta: '12:00', estado: 'no_asistio' }),
    ]
    expect(ver(huecosLibres({ ...base, citas }))).toEqual([
      'consultorio 10:00-13:00',
      'clinica 15:00-18:00',
    ])
  })

  it('en un consultorio de un solo sillón, cuenta las citas de otras profesionales', () => {
    const citas = [cita({ profesionalId: ROCIO, desde: '11:00', hasta: '12:00' })]
    expect(ver(huecosLibres({ ...base, citas }))).toContain('consultorio 10:00-11:00')
    expect(ver(huecosLibres({ ...base, citas }))).toContain('consultorio 12:00-13:00')
  })

  it('en la clínica (no controla el sillón) las citas de otras no importan', () => {
    const citas = [cita({ profesionalId: ROCIO, lugarId: CLINICA, desde: '15:00', hasta: '18:00' })]
    expect(ver(huecosLibres({ ...base, citas }))).toContain('clinica 15:00-18:00')
  })

  it('deja el margen de traslado alrededor de citas en otro lugar', () => {
    // Una cita suya en la clínica de 12:00 a 12:30: el consultorio queda
    // ocupado de 11:30 (salir) a 13:00 (volver).
    const citas = [cita({ lugarId: CLINICA, desde: '12:00', hasta: '12:30' })]
    expect(ver(huecosLibres({ ...base, citas }))).toContain('consultorio 10:00-11:30')
    expect(ver(huecosLibres({ ...base, citas })).join()).not.toContain('consultorio 13')
  })

  it('no sugiere horas que ya pasaron', () => {
    const huecos = huecosLibres({ ...base, citas: [], desde: hora('12:10') })
    expect(ver(huecos)).toEqual(['consultorio 12:10-13:00', 'clinica 15:00-18:00'])
  })
})

describe('horasSugeridas', () => {
  it('propone inicios cada 15 minutos que entran en el hueco', () => {
    const huecos = huecosLibres({
      ...base,
      citas: [cita({ desde: '10:00', hasta: '11:00' }), cita({ desde: '11:15', hasta: '11:30' })],
    })
    expect(ver(horasSugeridas(huecos, 60)).filter((h) => h.startsWith('consultorio'))).toEqual([
      'consultorio 11:30-12:30',
      'consultorio 11:45-12:45',
      'consultorio 12:00-13:00',
    ])
  })

  it('redondea el inicio al siguiente múltiplo del paso', () => {
    const huecos = huecosLibres({ ...base, citas: [], desde: hora('12:10') })
    expect(ver(horasSugeridas(huecos, 30)).slice(0, 2)).toEqual([
      'consultorio 12:15-12:45',
      'consultorio 12:30-13:00',
    ])
  })
})

describe('lugarSugerido', () => {
  it('es el lugar del tramo de esa hora, o el primero del día', () => {
    expect(lugarSugerido(horarios, LAURA, MARTES, ZONA_LA_PAZ, hora('16:00'))).toBe(CLINICA)
    expect(lugarSugerido(horarios, LAURA, MARTES, ZONA_LA_PAZ, hora('14:00'))).toBe(CONSULTORIO)
    expect(lugarSugerido(horarios, LAURA, '2026-11-22', ZONA_LA_PAZ)).toBeNull()
  })
})

describe('avisosDeCita', () => {
  const contexto = { fecha: MARTES, zona: ZONA_LA_PAZ, margenTrasladoMin: 30, horarios }

  it('sin avisos dentro del horario y sin traslados', () => {
    const nueva = {
      profesionalId: LAURA,
      lugarId: CONSULTORIO,
      inicio: hora('11:00'),
      fin: hora('12:00'),
    }
    expect(avisosDeCita(nueva, { ...contexto, citas: [] })).toEqual([])
  })

  it('avisa si la hora ya pasó, sin impedirlo', () => {
    const nueva = {
      profesionalId: LAURA,
      lugarId: CONSULTORIO,
      inicio: hora('11:00'),
      fin: hora('12:00'),
    }
    expect(avisosDeCita(nueva, { ...contexto, citas: [], ahora: hora('11:30') })).toEqual([
      { tipo: 'en_el_pasado' },
    ])
    expect(avisosDeCita(nueva, { ...contexto, citas: [], ahora: hora('10:30') })).toEqual([])
  })

  it('avisa si queda fuera del horario en ese lugar', () => {
    const nueva = {
      profesionalId: LAURA,
      lugarId: CONSULTORIO,
      inicio: hora('19:00'),
      fin: hora('20:00'),
    }
    expect(avisosDeCita(nueva, { ...contexto, citas: [] })).toEqual([{ tipo: 'fuera_de_horario' }])
  })

  it('avisa si no alcanza el tiempo para trasladarse desde otro lugar', () => {
    const citas = [cita({ desde: '12:00', hasta: '13:00' })]
    const nueva = {
      profesionalId: LAURA,
      lugarId: CLINICA,
      inicio: hora('15:00'),
      fin: hora('16:00'),
    }
    expect(avisosDeCita(nueva, { ...contexto, citas })).toEqual([])

    const apurada = { ...nueva, inicio: hora('13:10'), fin: hora('14:00') }
    expect(avisosDeCita(apurada, { ...contexto, citas })).toEqual([
      { tipo: 'fuera_de_horario' },
      { tipo: 'traslado', posicion: 'antes', otroLugarId: CONSULTORIO, minutosLibres: 10 },
    ])
  })

  it('avisa también si después tiene que ir a otro lugar', () => {
    const citas = [cita({ lugarId: CLINICA, desde: '15:00', hasta: '16:00' })]
    const nueva = {
      profesionalId: LAURA,
      lugarId: CONSULTORIO,
      inicio: hora('12:00'),
      fin: hora('13:00'),
    }
    expect(avisosDeCita(nueva, { ...contexto, citas })).toEqual([])

    const tarde = { ...nueva, inicio: hora('14:00'), fin: hora('14:50') }
    expect(avisosDeCita(tarde, { ...contexto, citas })).toContainEqual({
      tipo: 'traslado',
      posicion: 'despues',
      otroLugarId: CLINICA,
      minutosLibres: 10,
    })
  })
})

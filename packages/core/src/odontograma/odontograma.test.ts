import { describe, expect, it } from 'vitest'
import {
  ARCADAS,
  DatosRegistroOdontograma,
  FILAS_ODONTOGRAMA,
  calcularIndices,
  codigoParaTratar,
  describirPieza,
  estadoOdontograma,
  fechasDelOdontograma,
  registrosAlDia,
  errorDeRegistro,
  esPiezaValida,
  nombreCara,
  temporalDe,
  textoRegistro,
} from './odontograma'

describe('piezas FDI', () => {
  it('acepta permanentes 11–48 y temporales 51–85', () => {
    expect([11, 18, 28, 38, 48, 51, 55, 65, 75, 85].every(esPiezaValida)).toBe(true)
    expect([10, 19, 49, 56, 86, 90, 9, 36.5].some(esPiezaValida)).toBe(false)
  })

  it('ordena las arcadas de la derecha a la izquierda del paciente', () => {
    expect(ARCADAS.superiorPermanente.slice(6, 10)).toEqual([12, 11, 21, 22])
    expect(ARCADAS.superiorTemporal).toEqual([55, 54, 53, 52, 51, 61, 62, 63, 64, 65])
    expect(ARCADAS.inferiorPermanente.slice(0, 2)).toEqual([48, 47])
  })

  it('describe cada pieza por dentición y lado', () => {
    expect(describirPieza(18)).toBe('Permanente · superior derecha')
    expect(describirPieza(36)).toBe('Permanente · inferior izquierda')
    expect(describirPieza(55)).toBe('Temporal · superior derecha')
    expect(describirPieza(85)).toBe('Temporal · inferior derecha')
  })

  it('arma las filas de la tabla con la temporal al lado', () => {
    expect(FILAS_ODONTOGRAMA).toHaveLength(32)
    expect(FILAS_ODONTOGRAMA[0]).toEqual({ permanente: 18, temporal: null })
    expect(FILAS_ODONTOGRAMA[3]).toEqual({ permanente: 15, temporal: 55 })
    expect(temporalDe(34)).toBe(74)
    expect(temporalDe(46)).toBeNull()
  })
})

describe('caras', () => {
  it('incisal en las anteriores y palatina en las superiores', () => {
    expect(nombreCara('O', 11).corta).toBe('I')
    expect(nombreCara('O', 36).corta).toBe('O')
    expect(nombreCara('L', 25)).toEqual({ corta: 'P', larga: 'Palatina' })
    expect(nombreCara('L', 46)).toEqual({ corta: 'L', larga: 'Lingual' })
    expect(nombreCara('L', 64).corta).toBe('P')
  })
})

describe('textoRegistro', () => {
  it('escribe el registro como en papel', () => {
    expect(
      textoRegistro({ pieza: 36, caras: ['O', 'M', 'V'], grado: 2 }, { abreviatura: 'C' }),
    ).toBe('C II-OMV')
    expect(
      textoRegistro({ pieza: 21, caras: ['O', 'L'], grado: null }, { abreviatura: 'Obt' }),
    ).toBe('Obt-IP')
    expect(textoRegistro({ pieza: 16, caras: null, grado: null }, { abreviatura: 'Cor' })).toBe(
      'Cor',
    )
  })
})

describe('calcularIndices', () => {
  const codigos = [
    { id: 'c', indice: 'cariado' as const },
    { id: 'p', indice: 'perdido' as const },
    { id: 'o', indice: 'obturado' as const },
    { id: 'x', indice: null },
  ]

  it('cuenta cada pieza una vez: perdida antes que cariada y cariada antes que obturada', () => {
    const i = calcularIndices(
      [
        { pieza: 36, codigoId: 'c' },
        { pieza: 36, codigoId: 'o' },
        { pieza: 46, codigoId: 'o' },
        { pieza: 46, codigoId: 'o' },
        { pieza: 38, codigoId: 'p' },
        { pieza: 38, codigoId: 'c' },
        { pieza: 11, codigoId: 'x' },
        { pieza: 55, codigoId: 'c' },
        { pieza: 85, codigoId: 'p' },
        { pieza: 75, codigoId: 'o' },
      ],
      codigos,
    )
    expect(i.cpod).toEqual({ c: 1, p: 1, o: 1, total: 3 })
    expect(i.ceod).toEqual({ c: 1, e: 1, o: 1, total: 3 })
  })
})

describe('errorDeRegistro', () => {
  const sinNota = { nota: null }

  it('pide caras y rechaza el grado donde no va', () => {
    expect(
      errorDeRegistro({ porCaras: true, usaGrado: true }, { caras: [], grado: 2, ...sinNota }),
    ).toBe('Elige al menos una cara.')
    expect(
      errorDeRegistro({ porCaras: false, usaGrado: false }, { caras: null, grado: 1, ...sinNota }),
    ).toBe('Este código no lleva grado.')
    expect(
      errorDeRegistro(
        { porCaras: true, usaGrado: false },
        { caras: ['O'], grado: null, ...sinNota },
      ),
    ).toBeNull()
  })

  it('sin código alcanza con una nota', () => {
    expect(errorDeRegistro(null, { caras: null, grado: null, nota: 'Sensibilidad' })).toBeNull()
    expect(errorDeRegistro(null, { caras: null, grado: null, nota: '  ' })).toBe(
      'Elige un código o escribe una nota.',
    )
  })
})

describe('estadoOdontograma', () => {
  const codigos = [
    { id: 'C', tipo: 'hallazgo' as const, simbolo: 'superficie' as const },
    { id: 'Ext', tipo: 'hallazgo' as const, simbolo: 'cruz' as const },
    { id: 'RR', tipo: 'hallazgo' as const, simbolo: 'texto' as const },
    { id: 'Obt', tipo: 'realizado' as const, simbolo: 'superficie' as const },
    { id: 'PC', tipo: 'realizado' as const, simbolo: 'cruz' as const },
  ]
  const registro = (
    id: string,
    pieza: number,
    codigoId: string | null,
    resuelveId = null as string | null,
  ) => ({
    id,
    pieza,
    codigoId,
    resuelveId,
    caras: null,
    grado: null,
    nota: null,
    fecha: '2026-01-10',
  })

  it('un hallazgo tratado deja de estar vigente y sale del plan', () => {
    const e = estadoOdontograma(
      [
        registro('caries36', 36, 'C'),
        registro('obt36', 36, 'Obt', 'caries36'),
        registro('ext15', 15, 'Ext'),
        registro('caries55', 55, 'C'),
        registro('nota14', 14, null),
      ],
      codigos,
    )
    expect(e.vigentes.map((r) => r.id)).toEqual(['obt36', 'ext15', 'caries55', 'nota14'])
    // Por pieza, en el orden de la tabla: 15, después su temporal 55.
    expect(e.pendientes.map((r) => r.id)).toEqual(['ext15', 'caries55'])
    expect(e.tratadoPor.get('caries36')?.id).toBe('obt36')
  })

  it('sugiere el código realizado que se dibuja igual', () => {
    expect(codigoParaTratar({ simbolo: 'superficie' }, codigos)?.id).toBe('Obt')
    expect(codigoParaTratar({ simbolo: 'cruz' }, codigos)?.id).toBe('PC')
    expect(codigoParaTratar({ simbolo: 'texto' }, codigos)).toBeNull()
  })
})

describe('la boca en una fecha', () => {
  const codigos = [
    { id: 'C', tipo: 'hallazgo' as const },
    { id: 'Obt', tipo: 'realizado' as const },
  ]
  const r = (id: string, codigoId: string, fecha: string, resuelveId: string | null = null) => ({
    id,
    pieza: 36,
    codigoId,
    resuelveId,
    caras: null,
    grado: null,
    nota: null,
    fecha,
  })
  const registros = [
    r('caries', 'C', '2026-03-03'),
    r('obt', 'Obt', '2026-03-10', 'caries'),
    r('caries2', 'C', '2026-04-07'),
  ]

  it('lista los días con registros, del inicial al más nuevo', () => {
    expect(fechasDelOdontograma(registros)).toEqual(['2026-03-03', '2026-03-10', '2026-04-07'])
  })

  it('antes del tratamiento, el hallazgo se ve pendiente', () => {
    const inicial = estadoOdontograma(registrosAlDia(registros, '2026-03-05'), codigos)
    expect(inicial.pendientes.map((x) => x.id)).toEqual(['caries'])
    const despues = estadoOdontograma(registrosAlDia(registros, '2026-03-10'), codigos)
    expect(despues.pendientes).toEqual([])
    expect(despues.vigentes.map((x) => x.id)).toEqual(['obt'])
  })
})

describe('DatosRegistroOdontograma', () => {
  const base = {
    id: '5a0e1c2d-3b4f-4a5b-8c6d-7e8f9a0b1c2d',
    pacienteId: '6b1f2d3e-4c5a-4b6c-9d7e-8f9a0b1c2d3e',
    codigoId: null,
    resuelveId: null,
    pieza: 14,
    caras: null,
    grado: null,
    fecha: '2026-01-10',
  }

  it('acepta una nota sola y rechaza un registro vacío', () => {
    expect(DatosRegistroOdontograma.safeParse({ ...base, nota: ' Sensibilidad ' }).data?.nota).toBe(
      'Sensibilidad',
    )
    expect(
      DatosRegistroOdontograma.safeParse({ ...base, nota: '' }).error?.issues[0]?.message,
    ).toBe('Elige un código o escribe una nota.')
  })
})

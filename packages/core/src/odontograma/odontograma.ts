import { z } from 'zod'
import { ZONA_LA_PAZ, esFechaValida, fechaEnZona, type Fecha } from '../fechas/fechas'

// Odontograma (decisión 0020). Numeración FDI y caras según las Normas en
// Salud Oral (2010); los códigos salen del catálogo de cada organización.

export const CARAS = ['O', 'M', 'D', 'V', 'L'] as const
export type Cara = (typeof CARAS)[number]

export const TIPOS_CODIGO = ['hallazgo', 'realizado'] as const
export type TipoCodigo = (typeof TIPOS_CODIGO)[number]

/** Las formas de dibujo son fijas; los códigos que las usan, no (0020). */
export const SIMBOLOS_CODIGO = [
  'superficie',
  'cruz',
  'circulo',
  'linea_vertical',
  'linea_horizontal',
  'texto',
] as const
export type SimboloCodigo = (typeof SIMBOLOS_CODIGO)[number]

export const INDICES_CODIGO = ['cariado', 'perdido', 'obturado'] as const
export type IndiceCodigo = (typeof INDICES_CODIGO)[number]

/** Cómo se dibuja cada forma, para elegirla en el catálogo. */
export const NOMBRE_SIMBOLO: Record<SimboloCodigo, string> = {
  superficie: 'Pinta las caras',
  cruz: 'Cruz sobre la pieza',
  circulo: 'Círculo alrededor',
  linea_vertical: 'Línea vertical (raíz)',
  linea_horizontal: 'Línea horizontal',
  texto: 'Solo la abreviatura',
}

/** En qué cuenta cada índice, según la dentición (CPO-D y ceo-d). */
export const NOMBRE_INDICE: Record<IndiceCodigo, string> = {
  cariado: 'Cariada',
  perdido: 'Perdida o con extracción indicada',
  obturado: 'Obturada',
}

export interface CodigoOdontograma {
  id: string
  abreviatura: string
  nombre: string
  tipo: TipoCodigo
  simbolo: SimboloCodigo
  porCaras: boolean
  usaGrado: boolean
  indice: IndiceCodigo | null
}

export interface RegistroOdontograma {
  id: string
  pieza: number
  /** null: una nota sola sobre la pieza. */
  codigoId: string | null
  /** En un registro realizado: el hallazgo que trató (0021). */
  resuelveId: string | null
  caras: Cara[] | null
  grado: number | null
  nota: string | null
  fecha: string
}

/** Permanentes 11–48 y temporales 51–85. */
export function esPiezaValida(pieza: number): boolean {
  if (!Number.isInteger(pieza)) return false
  const cuadrante = Math.floor(pieza / 10)
  const unidad = pieza % 10
  if (cuadrante >= 1 && cuadrante <= 4) return unidad >= 1 && unidad <= 8
  if (cuadrante >= 5 && cuadrante <= 8) return unidad >= 1 && unidad <= 5
  return false
}

export const esTemporal = (pieza: number) => Math.floor(pieza / 10) >= 5

/** Cuadrantes superiores: 1, 2, 5 y 6. */
export const esSuperior = (pieza: number) => [1, 2, 5, 6].includes(Math.floor(pieza / 10))

/** Incisivos y caninos: no tienen cara oclusal, sino borde incisal. */
export const esAnterior = (pieza: number) => pieza % 10 <= 3

/** Nombre de la cara según la pieza: incisal en las anteriores, palatina en las superiores. */
export function nombreCara(cara: Cara, pieza: number): { corta: string; larga: string } {
  switch (cara) {
    case 'O':
      return esAnterior(pieza) ? { corta: 'I', larga: 'Incisal' } : { corta: 'O', larga: 'Oclusal' }
    case 'M':
      return { corta: 'M', larga: 'Mesial' }
    case 'D':
      return { corta: 'D', larga: 'Distal' }
    case 'V':
      return { corta: 'V', larga: 'Vestibular' }
    case 'L':
      return esSuperior(pieza)
        ? { corta: 'P', larga: 'Palatina' }
        : { corta: 'L', larga: 'Lingual' }
  }
}

const rango = (desde: number, hasta: number) =>
  Array.from({ length: Math.abs(hasta - desde) + 1 }, (_, i) =>
    desde < hasta ? desde + i : desde - i,
  )

/**
 * Las piezas en el orden en que se miran en el gráfico, de la derecha del
 * paciente a su izquierda: arriba las superiores, abajo las inferiores.
 */
export const ARCADAS = {
  superiorPermanente: [...rango(18, 11), ...rango(21, 28)],
  superiorTemporal: [...rango(55, 51), ...rango(61, 65)],
  inferiorTemporal: [...rango(85, 81), ...rango(71, 75)],
  inferiorPermanente: [...rango(48, 41), ...rango(31, 38)],
} as const

/** La temporal que ocupa el lugar de una permanente (15 → 55), si la hay. */
export function temporalDe(permanente: number): number | null {
  const unidad = permanente % 10
  return unidad <= 5 ? (Math.floor(permanente / 10) + 4) * 10 + unidad : null
}

/** Filas de la tabla, como en su ficha: la permanente y la temporal juntas. */
export const FILAS_ODONTOGRAMA: { permanente: number; temporal: number | null }[] = [
  ...rango(18, 11),
  ...rango(21, 28),
  ...rango(38, 31),
  ...rango(41, 48),
].map((permanente) => ({ permanente, temporal: temporalDe(permanente) }))

const ROMANOS = ['I', 'II', 'III', 'IV'] as const

/** Como en papel: "C II-OMV", "Obt-OM", "Cor". */
export function textoRegistro(
  registro: Pick<RegistroOdontograma, 'pieza' | 'caras' | 'grado'>,
  codigo: Pick<CodigoOdontograma, 'abreviatura'>,
): string {
  const grado = registro.grado ? ` ${ROMANOS[registro.grado - 1]}` : ''
  const caras = registro.caras?.length
    ? `-${registro.caras.map((c) => nombreCara(c, registro.pieza).corta).join('')}`
    : ''
  return `${codigo.abreviatura}${grado}${caras}`
}

export interface Indices {
  /** Permanentes: cariadas, perdidas (o con extracción indicada) y obturadas. */
  cpod: { c: number; p: number; o: number; total: number }
  /** Temporales: cariadas, con extracción indicada y obturadas. */
  ceod: { c: number; e: number; o: number; total: number }
}

/**
 * CPO-D y ceo-d (Normas en Salud Oral 2010). Cada pieza cuenta una sola vez:
 * perdida antes que cariada, y cariada antes que obturada.
 */
export function calcularIndices(
  registros: Pick<RegistroOdontograma, 'pieza' | 'codigoId'>[],
  codigos: Pick<CodigoOdontograma, 'id' | 'indice'>[],
): Indices {
  const indiceDe = new Map(codigos.map((c) => [c.id, c.indice]))
  const porPieza = new Map<number, Set<IndiceCodigo>>()
  for (const r of registros) {
    const indice = r.codigoId ? indiceDe.get(r.codigoId) : null
    if (!indice) continue
    const conjunto = porPieza.get(r.pieza) ?? new Set()
    conjunto.add(indice)
    porPieza.set(r.pieza, conjunto)
  }

  const cpod = { c: 0, p: 0, o: 0, total: 0 }
  const ceod = { c: 0, e: 0, o: 0, total: 0 }
  for (const [pieza, conjunto] of porPieza) {
    const cuenta = conjunto.has('perdido')
      ? 'perdido'
      : conjunto.has('cariado')
        ? 'cariado'
        : 'obturado'
    if (esTemporal(pieza)) {
      if (cuenta === 'perdido') ceod.e++
      else if (cuenta === 'cariado') ceod.c++
      else ceod.o++
      ceod.total++
    } else {
      if (cuenta === 'perdido') cpod.p++
      else if (cuenta === 'cariado') cpod.c++
      else cpod.o++
      cpod.total++
    }
  }
  return { cpod, ceod }
}

/**
 * Lo que le falta a un registro según su código, o null si está completo.
 * Sin código (`codigo` null), alcanza con una nota.
 */
export function errorDeRegistro(
  codigo: Pick<CodigoOdontograma, 'porCaras' | 'usaGrado'> | null,
  registro: Pick<RegistroOdontograma, 'caras' | 'grado' | 'nota'>,
): string | null {
  if (!codigo) return registro.nota?.trim() ? null : 'Elige un código o escribe una nota.'
  if (codigo.porCaras && !registro.caras?.length) return 'Elige al menos una cara.'
  if (!codigo.usaGrado && registro.grado !== null) return 'Este código no lleva grado.'
  return null
}

/** Un registro nuevo del odontograma: un código, o una nota sola sobre la pieza. */
export const DatosRegistroOdontograma = z
  .object({
    id: z.uuid(),
    pacienteId: z.uuid(),
    codigoId: z.uuid().nullable(),
    /** Al marcar un hallazgo como tratado (0021). */
    resuelveId: z.uuid().nullable(),
    pieza: z.number().refine(esPiezaValida, 'Esa pieza no existe.'),
    caras: z.array(z.enum(CARAS)).nullable(),
    grado: z.number().int().min(1).max(4).nullable(),
    nota: z
      .string()
      .trim()
      .max(500, 'Máximo 500 caracteres.')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    fecha: z
      .string()
      .refine(esFechaValida, 'Elige una fecha válida.')
      .refine((v) => v <= fechaEnZona(new Date(), ZONA_LA_PAZ), 'La fecha no puede ser futura.'),
  })
  .refine((r) => r.codigoId !== null || r.nota !== null, {
    message: 'Elige un código o escribe una nota.',
    path: ['codigoId'],
  })
export type DatosRegistroOdontograma = z.infer<typeof DatosRegistroOdontograma>

/**
 * Un código del catálogo, nuevo o editado (0022). Postgres controla además
 * que un código ya usado no cambie de tipo, de caras ni de grado (OD006).
 */
export const DatosCodigoOdontograma = z
  .object({
    id: z.uuid(),
    abreviatura: z
      .string()
      .trim()
      .min(1, 'Escribe la abreviatura.')
      .max(8, 'La abreviatura tiene hasta 8 caracteres.'),
    nombre: z.string().trim().min(1, 'Escribe el nombre.').max(80, 'Máximo 80 caracteres.'),
    tipo: z.enum(TIPOS_CODIGO),
    simbolo: z.enum(SIMBOLOS_CODIGO),
    porCaras: z.boolean(),
    usaGrado: z.boolean(),
    indice: z.enum(INDICES_CODIGO).nullable(),
  })
  .refine((c) => c.simbolo !== 'superficie' || c.porCaras, {
    message: 'Para pintar las caras, el código tiene que ir por caras.',
    path: ['simbolo'],
  })
export type DatosCodigoOdontograma = z.infer<typeof DatosCodigoOdontograma>

const LADOS = ['superior derecha', 'superior izquierda', 'inferior izquierda', 'inferior derecha']

/** "Permanente · superior derecha" o "Temporal · inferior izquierda". */
export function describirPieza(pieza: number): string {
  const cuadrante = Math.floor(pieza / 10)
  const lado = LADOS[(cuadrante - 1) % 4] ?? ''
  return `${esTemporal(pieza) ? 'Temporal' : 'Permanente'} · ${lado}`
}

export interface EstadoOdontograma<R extends RegistroOdontograma> {
  /** Lo que se dibuja y cuenta en los índices: todo menos los hallazgos ya tratados. */
  vigentes: R[]
  /** Hallazgos sin tratar: el plan de tratamiento, ordenado por pieza. */
  pendientes: R[]
  /** Hallazgo tratado → el registro realizado que lo trató. */
  tratadoPor: Map<string, R>
}

/**
 * Estado del odontograma a partir de los registros no anulados (0021). Un
 * hallazgo deja de estar vigente cuando un registro realizado lo resuelve.
 */
export function estadoOdontograma<R extends RegistroOdontograma>(
  registros: R[],
  codigos: Pick<CodigoOdontograma, 'id' | 'tipo'>[],
): EstadoOdontograma<R> {
  const tipoDe = new Map(codigos.map((c) => [c.id, c.tipo]))
  const tratadoPor = new Map<string, R>()
  for (const r of registros) if (r.resuelveId) tratadoPor.set(r.resuelveId, r)
  const vigentes = registros.filter((r) => !tratadoPor.has(r.id))
  const pendientes = vigentes
    .filter((r) => r.codigoId !== null && tipoDe.get(r.codigoId) === 'hallazgo')
    .sort((a, b) => FILAS_ORDEN.indexOf(a.pieza) - FILAS_ORDEN.indexOf(b.pieza))
  return { vigentes, pendientes, tratadoPor }
}

// Orden de las piezas en la tabla, con cada temporal después de su permanente.
const FILAS_ORDEN = FILAS_ODONTOGRAMA.flatMap((f) =>
  f.temporal ? [f.permanente, f.temporal] : [f.permanente],
)

/**
 * Qué código realizado sugerir al tratar un hallazgo: el primero que se dibuja
 * igual (caries → obturación, extracción indicada → perdida, endodoncia
 * indicada → endodoncia). Es solo una sugerencia: se puede cambiar.
 */
export function codigoParaTratar<C extends Pick<CodigoOdontograma, 'id' | 'tipo' | 'simbolo'>>(
  hallazgo: Pick<CodigoOdontograma, 'simbolo'>,
  codigos: C[],
): C | null {
  if (hallazgo.simbolo === 'texto') return null
  return codigos.find((c) => c.tipo === 'realizado' && c.simbolo === hallazgo.simbolo) ?? null
}

/**
 * Los registros como estaban un día: los de esa fecha o antes. Un tratamiento
 * posterior no cuenta, así que su hallazgo vuelve a verse pendiente. Lo
 * anulado nunca se incluye: fue un error (0021).
 */
export function registrosAlDia<R extends Pick<RegistroOdontograma, 'fecha'>>(
  registros: R[],
  fecha: Fecha,
): R[] {
  return registros.filter((r) => r.fecha <= fecha)
}

/** Los días con registros, del más viejo (el odontograma inicial) al más nuevo. */
export function fechasDelOdontograma(registros: Pick<RegistroOdontograma, 'fecha'>[]): Fecha[] {
  return [...new Set(registros.map((r) => r.fecha))].sort()
}

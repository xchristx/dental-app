import { esSuperior, type Cara, type RegistroOdontograma } from '@dental/core'
import type { Codigo } from '@/lib/odontograma/datos'
import { cn } from '@/lib/utils'

// Diagrama de cinco caras (0020): un cuadrado con el centro (oclusal o
// incisal) y cuatro trapecios alrededor. viewBox de 40 × 40.
const REGIONES = {
  arriba: '4,4 36,4 26,14 14,14',
  abajo: '4,36 36,36 26,26 14,26',
  izquierda: '4,4 14,14 14,26 4,36',
  derecha: '36,4 26,14 26,26 36,36',
  centro: '14,14 26,14 26,26 14,26',
} as const
type Region = keyof typeof REGIONES

/**
 * En qué parte del dibujo cae cada cara. Vestibular mira hacia afuera de la
 * boca (arriba en las superiores) y mesial hacia la línea media: a la derecha
 * en las piezas del lado derecho del paciente, que se dibujan a la izquierda.
 */
function regionDe(cara: Cara, pieza: number): Region {
  const superior = esSuperior(pieza)
  const ladoDerecho = [1, 4, 5, 8].includes(Math.floor(pieza / 10))
  switch (cara) {
    case 'O':
      return 'centro'
    case 'V':
      return superior ? 'arriba' : 'abajo'
    case 'L':
      return superior ? 'abajo' : 'arriba'
    case 'M':
      return ladoDerecho ? 'derecha' : 'izquierda'
    case 'D':
      return ladoDerecho ? 'izquierda' : 'derecha'
  }
}

const COLOR = {
  hallazgo: { relleno: 'fill-odontograma-rojo', trazo: 'stroke-odontograma-rojo' },
  realizado: { relleno: 'fill-odontograma-azul', trazo: 'stroke-odontograma-azul' },
} as const

/** El dibujo de una pieza con sus registros. Es decorativo: el botón que lo contiene lo describe. */
export function Diente({
  pieza,
  registros,
  codigos,
  className,
}: {
  pieza: number
  registros: RegistroOdontograma[]
  codigos: Map<string, Codigo>
  className?: string
}) {
  // Lo realizado debajo y los hallazgos encima: lo que hay que tratar se ve siempre.
  const ordenados = registros
    .map((r) => ({ r, c: codigos.get(r.codigoId) }))
    .filter((x): x is { r: RegistroOdontograma; c: Codigo } => x.c !== undefined)
    .sort((a, b) => (a.c.tipo === b.c.tipo ? 0 : a.c.tipo === 'realizado' ? -1 : 1))

  const pintadas = new Map<Region, string>()
  for (const { r, c } of ordenados) {
    if (c.simbolo !== 'superficie') continue
    for (const cara of r.caras ?? []) pintadas.set(regionDe(cara, pieza), COLOR[c.tipo].relleno)
  }

  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('block', className)}>
      {(Object.keys(REGIONES) as Region[]).map((region) => (
        <polygon
          key={region}
          points={REGIONES[region]}
          className={cn('stroke-foreground', pintadas.get(region) ?? 'fill-card')}
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ))}
      {ordenados.map(({ r, c }) => {
        const trazo = cn(COLOR[c.tipo].trazo, 'fill-none')
        switch (c.simbolo) {
          case 'cruz':
            return (
              <g key={r.id} className={trazo} strokeWidth={3.5} strokeLinecap="round">
                <line x1={3} y1={3} x2={37} y2={37} />
                <line x1={37} y1={3} x2={3} y2={37} />
              </g>
            )
          case 'circulo':
            return <circle key={r.id} cx={20} cy={20} r={18} className={trazo} strokeWidth={2.5} />
          case 'linea_vertical':
            return (
              <line
                key={r.id}
                x1={20}
                y1={0}
                x2={20}
                y2={40}
                className={trazo}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            )
          case 'linea_horizontal':
            return (
              <line
                key={r.id}
                x1={0}
                y1={20}
                x2={40}
                y2={20}
                className={trazo}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            )
          default:
            return null
        }
      })}
    </svg>
  )
}

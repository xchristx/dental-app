import { CARAS, nombreCara, type Cara, type TipoCodigo } from '@dental/core'
import { cn } from '@/lib/utils'
import { REGIONES, regionDe } from './diente'

// Orden en que se leen las caras alrededor del diente.
const ORDEN_CARAS: Cara[] = ['V', 'M', 'O', 'D', 'L']

const RELLENO: Record<TipoCodigo, string> = {
  hallazgo: 'fill-odontograma-rojo',
  realizado: 'fill-odontograma-azul',
}

/**
 * Elegir caras tocando un diente grande. El dibujo es un atajo para el dedo
 * o el mouse; los botones de abajo son los controles accesibles (teclado y
 * lector de pantalla) y muestran el nombre de cada cara según la pieza.
 */
export function CarasGrandes({
  pieza,
  caras,
  tipo,
  onCambiar,
}: {
  pieza: number
  caras: Cara[]
  /** Color con que se pintan las caras elegidas. */
  tipo: TipoCodigo
  onCambiar: (caras: Cara[]) => void
}) {
  const alternar = (cara: Cara) =>
    onCambiar(
      caras.includes(cara)
        ? caras.filter((c) => c !== cara)
        : CARAS.filter((c) => c === cara || caras.includes(c)),
    )

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium">Caras</legend>
      <svg
        viewBox="0 0 40 40"
        aria-hidden="true"
        className="mx-auto block size-40 touch-manipulation select-none"
      >
        {ORDEN_CARAS.map((cara) => {
          const elegida = caras.includes(cara)
          return (
            <polygon
              key={cara}
              points={REGIONES[regionDe(cara, pieza)]}
              onClick={() => alternar(cara)}
              className={cn(
                'stroke-foreground cursor-pointer transition-colors duration-150',
                elegida ? RELLENO[tipo] : 'fill-card hover:fill-muted',
              )}
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          )
        })}
        {/* La letra de cada cara, encima, sin capturar el toque. */}
        {ORDEN_CARAS.map((cara) => {
          const [x, y] = CENTROS[regionDe(cara, pieza)]
          return (
            <text
              key={cara}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                'pointer-events-none text-[4px] font-medium',
                caras.includes(cara) ? 'fill-primary-foreground' : 'fill-muted-foreground',
              )}
            >
              {nombreCara(cara, pieza).corta}
            </text>
          )
        })}
      </svg>
      <div className="grid grid-cols-5 gap-1.5">
        {ORDEN_CARAS.map((cara) => {
          const nombre = nombreCara(cara, pieza)
          const elegida = caras.includes(cara)
          return (
            <label
              key={cara}
              title={nombre.larga}
              className={cn(
                'border-input flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-sm border text-sm transition-colors duration-150',
                'has-[:focus-visible]:ring-ring/40 has-[:focus-visible]:ring-3',
                elegida
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card hover:bg-muted',
              )}
            >
              <input
                type="checkbox"
                checked={elegida}
                onChange={() => alternar(cara)}
                className="sr-only"
              />
              <span className="font-medium">{nombre.corta}</span>
              <span className="text-[0.6875rem] leading-tight opacity-80">{nombre.larga}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// Centro de cada región del dibujo, para la letra.
const CENTROS = {
  arriba: [20, 8.5],
  abajo: [20, 31.5],
  izquierda: [8.5, 20],
  derecha: [31.5, 20],
  centro: [20, 20],
} as const

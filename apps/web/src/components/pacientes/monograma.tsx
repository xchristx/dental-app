import { iniciales } from '@dental/core'
import { cn } from '@/lib/utils'

/**
 * Iniciales del paciente en un cuadrado de esquinas suaves. Es decorativo: el
 * nombre siempre está escrito al lado. Monocromático, porque el color está
 * reservado para el lugar, el estado y los avisos (docs/diseno.md).
 */
export function Monograma({
  nombre,
  grande = false,
  className,
}: {
  nombre: string
  grande?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-muted text-foreground grid shrink-0 place-items-center font-medium select-none',
        grande ? 'titulo-hoja size-14 rounded-xl' : 'size-10 rounded-lg text-sm',
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  )
}

import { cn } from '@/lib/utils'

/**
 * Indicador de carga: un <progress> sin valor, que los lectores de pantalla
 * anuncian como barra de progreso. Los estilos están en globals.css.
 *
 * Con `decorativo`, queda fuera del árbol de accesibilidad: sirve dentro de
 * un enlace o un botón, donde cambiaría su nombre. Entonces el aviso lo da
 * otro elemento (por ejemplo, un role="status").
 */
export function Cargando({
  etiqueta = 'Cargando',
  decorativo = false,
  className,
}: {
  etiqueta?: string
  decorativo?: boolean
  className?: string
}) {
  return (
    <progress
      aria-label={decorativo ? undefined : etiqueta}
      aria-hidden={decorativo || undefined}
      className={cn('cargando', className)}
    />
  )
}

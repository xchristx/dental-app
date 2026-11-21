'use client'

/**
 * Enlace que cambia la URL sin ir al servidor, con `history.pushState`, que
 * Next integra con `useSearchParams`. Sirve cuando los datos ya están en la
 * página: abrir el detalle de una cita o pasar a otro día de la misma semana.
 * "Atrás" vuelve, y con Ctrl o clic medio se abre en otra pestaña como un
 * enlace normal.
 */
export function EnlaceDetalle({
  href,
  children,
  ...props
}: React.ComponentProps<'a'> & { href: string }) {
  return (
    <a
      {...props}
      href={href}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        window.history.pushState(null, '', href)
      }}
    >
      {children}
    </a>
  )
}

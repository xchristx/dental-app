'use client'

/**
 * Enlace que abre el detalle de una cita sin ir al servidor: cambia la URL con
 * `history.pushState`, que Next integra con `useSearchParams`. Los datos ya
 * están en la página. "Atrás" lo cierra, y con Ctrl o clic medio se abre en
 * otra pestaña como un enlace normal.
 */
export function EnlaceDetalle({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      className={className}
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

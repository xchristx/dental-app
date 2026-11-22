import { useRouter } from '@tanstack/react-router'

/**
 * Enlace interno: un `<a>` normal que navega con el router, sin recargar la
 * página. Con Ctrl, Shift o clic medio se abre en otra pestaña, como cualquier
 * enlace. Recibe la URL completa (`/?fecha=…&cita=…`) porque así se arman en
 * toda la app.
 */
export function Enlace({
  href,
  onClick,
  reemplazar = false,
  ...props
}: React.ComponentProps<'a'> & { href: string; reemplazar?: boolean }) {
  const router = useRouter()
  return (
    <a
      {...props}
      href={href}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        void router.navigate({ href, replace: reemplazar })
      }}
    />
  )
}

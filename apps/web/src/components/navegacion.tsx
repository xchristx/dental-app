import { CalendarDotsIcon, GearSixIcon, UsersIcon } from '@phosphor-icons/react'
import { Enlace } from '@/components/enlace'
import { useRutaActual } from '@/lib/navegacion'
import { cn } from '@/lib/utils'

// Secciones del MVP 1 (decisión 0009). Cambiar de sección es instantáneo: la
// página se dibuja enseguida con su esqueleto mientras llegan los datos.
const secciones = [
  { href: '/', texto: 'Agenda', Icono: CalendarDotsIcon },
  { href: '/pacientes', texto: 'Pacientes', Icono: UsersIcon },
  { href: '/ajustes', texto: 'Ajustes', Icono: GearSixIcon },
] as const

function estaActiva(ruta: string, href: string) {
  return href === '/' ? ruta === '/' : ruta.startsWith(href)
}

/** Barra lateral de escritorio (desde `lg`). */
export function NavegacionLateral() {
  const ruta = useRutaActual()
  return (
    <ul className="flex flex-col gap-1">
      {secciones.map(({ href, texto, Icono }) => {
        const activa = estaActiva(ruta, href)
        return (
          <li key={href}>
            <Enlace
              href={href}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-150',
                activa
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icono weight="bold" className="size-4" />
              {texto}
            </Enlace>
          </li>
        )
      })}
    </ul>
  )
}

/** Barra inferior de celular y tablet (hasta `lg`). */
export function NavegacionInferior() {
  const ruta = useRutaActual()
  return (
    <ul className="grid grid-cols-3">
      {secciones.map(({ href, texto, Icono }) => {
        const activa = estaActiva(ruta, href)
        return (
          <li key={href}>
            <Enlace
              href={href}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 text-sm transition-colors duration-150',
                activa ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              <Icono weight="bold" className="size-5" />
              {texto}
            </Enlace>
          </li>
        )
      })}
    </ul>
  )
}

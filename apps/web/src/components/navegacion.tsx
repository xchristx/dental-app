'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDotsIcon, GearSixIcon, UsersIcon } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

// Secciones del MVP 1 (decisión 0009).
const secciones = [
  { href: '/', texto: 'Agenda', Icono: CalendarDotsIcon },
  { href: '/pacientes', texto: 'Pacientes', Icono: UsersIcon },
  { href: '/ajustes', texto: 'Ajustes', Icono: GearSixIcon },
] as const

function estaActiva(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Barra lateral de escritorio (desde `lg`). */
export function NavegacionLateral() {
  const pathname = usePathname()

  return (
    <ul className="flex flex-col gap-1">
      {secciones.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href)
        return (
          <li key={href}>
            <Link
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
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** Barra inferior de celular y tablet (hasta `lg`). */
export function NavegacionInferior() {
  const pathname = usePathname()

  return (
    <ul className="grid grid-cols-3">
      {secciones.map(({ href, texto, Icono }) => {
        const activa = estaActiva(pathname, href)
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={activa ? 'page' : undefined}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 text-sm transition-colors duration-150',
                activa ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              <Icono weight="bold" className="size-5" />
              {texto}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

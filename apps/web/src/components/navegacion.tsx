'use client'

import { Suspense } from 'react'
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

function estaActiva(pathname: string | null, href: string) {
  if (pathname === null) return false
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

// En rutas dinámicas (/pacientes/[id]) la URL se conoce recién en el request:
// con Cache Components, leerla va dentro de <Suspense>. Mientras tanto se
// dibuja la misma navegación sin marcar la sección activa.
function ConRutaActual({ Lista }: { Lista: (p: { pathname: string | null }) => React.ReactNode }) {
  return (
    <Suspense fallback={<Lista pathname={null} />}>
      <LeerRuta Lista={Lista} />
    </Suspense>
  )
}

function LeerRuta({ Lista }: { Lista: (p: { pathname: string | null }) => React.ReactNode }) {
  return <Lista pathname={usePathname()} />
}

function ListaLateral({ pathname }: { pathname: string | null }) {
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

function ListaInferior({ pathname }: { pathname: string | null }) {
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

/** Barra lateral de escritorio (desde `lg`). */
export function NavegacionLateral() {
  return <ConRutaActual Lista={ListaLateral} />
}

/** Barra inferior de celular y tablet (hasta `lg`). */
export function NavegacionInferior() {
  return <ConRutaActual Lista={ListaInferior} />
}

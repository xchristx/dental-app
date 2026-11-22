'use client'

import { Suspense } from 'react'
import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDotsIcon, GearSixIcon, UsersIcon } from '@phosphor-icons/react'
import { Cargando } from '@/components/ui/cargando'
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

/**
 * Ícono y texto de una sección. Si la sección todavía no se precargó (la
 * primera vez, o con mala señal), el servidor puede tardar en responder: el
 * texto se marca enseguida y el ícono pasa a ser un indicador de carga, para
 * que no parezca que la app se quedó congelada.
 */
function ContenidoSeccion({
  Icono,
  texto,
  tamano,
}: {
  Icono: (typeof secciones)[number]['Icono']
  texto: string
  tamano: string
}) {
  const { pending } = useLinkStatus()
  return (
    <>
      <span className={cn('grid place-items-center *:col-start-1 *:row-start-1', tamano)}>
        <Icono weight="bold" className={cn(tamano, pending && 'cargando-reemplaza')} />
        {pending && <Cargando decorativo className={tamano} />}
      </span>
      <span className={cn(pending && 'text-foreground')}>{texto}</span>
    </>
  )
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
              <ContenidoSeccion Icono={Icono} texto={texto} tamano="size-4" />
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
              <ContenidoSeccion Icono={Icono} texto={texto} tamano="size-5" />
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

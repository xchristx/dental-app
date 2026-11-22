import { useCallback } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'

/** Ir a una URL interna (`/?fecha=…`). Con `reemplazar`, no suma una entrada al historial. */
export function useIr() {
  const router = useRouter()
  return useCallback(
    (href: string, { reemplazar = false }: { reemplazar?: boolean } = {}) =>
      router.navigate({ href, replace: reemplazar }),
    [router],
  )
}

/** Un parámetro de la URL actual (`?fecha=…`), o null. */
export function useParametro(nombre: string): string | null {
  const busqueda = useRouterState({ select: (s) => s.location.searchStr })
  return new URLSearchParams(busqueda).get(nombre)
}

/** La ruta actual, sin parámetros (`/pacientes`). */
export function useRutaActual(): string {
  return useRouterState({ select: (s) => s.location.pathname })
}

/** Título de la pestaña: "Pacientes · Sifel". Sin título, el de la app. */
export function tituloDePagina(titulo?: string) {
  document.title = titulo ? `${titulo} · Sifel` : 'Sifel · Agenda dental'
}

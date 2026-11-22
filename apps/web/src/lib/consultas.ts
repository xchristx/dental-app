import { QueryClient } from '@tanstack/react-query'

/**
 * Caché de datos de la app (TanStack Query). Lo ya cargado se muestra al
 * instante y se vuelve a pedir en segundo plano. Después de guardar algo se
 * invalida todo: es lo que hacía `refresh()` en la versión con Next.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Datos de una sola usuaria: 30 s frescos alcanza, y al volver a la
      // pestaña se actualizan solos.
      staleTime: 30_000,
      retry: 1,
    },
  },
})

/** Vuelve a pedir lo que está en pantalla después de guardar un cambio. */
export function refrescar() {
  void queryClient.invalidateQueries()
}

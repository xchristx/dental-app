import { lazyRouteComponent } from '@tanstack/react-router'

// Páginas que se descargan aparte. "Entrar" y la agenda van en el archivo
// principal porque son lo primero que se ve; el resto no hace falta para la
// primera pantalla.
export const PaginaPacientes = lazyRouteComponent(() => import('./pacientes'), 'PaginaPacientes')
export const PaginaPaciente = lazyRouteComponent(() => import('./paciente'), 'PaginaPaciente')
export const PaginaOdontograma = lazyRouteComponent(
  () => import('./odontograma'),
  'PaginaOdontograma',
)
export const PaginaAjustes = lazyRouteComponent(() => import('./ajustes'), 'PaginaAjustes')
export const PaginaVolverDeGoogle = lazyRouteComponent(
  () => import('./volver-de-google'),
  'PaginaVolverDeGoogle',
)

/**
 * Descarga las páginas de la app cuando el navegador queda libre, para que
 * cambiar de sección siga siendo instantáneo: al tocar "Pacientes" el código
 * ya está.
 */
export function precargarPaginas() {
  const precargar = () => {
    void PaginaPacientes.preload?.()
    void PaginaPaciente.preload?.()
    void PaginaOdontograma.preload?.()
    void PaginaAjustes.preload?.()
  }
  // Safari no tiene requestIdleCallback.
  if ('requestIdleCallback' in window) requestIdleCallback(precargar, { timeout: 2000 })
  else setTimeout(precargar, 1000)
}

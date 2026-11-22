import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { rutaInternaSegura } from '@dental/core'
import { sesionActual } from '@/lib/auth/acciones'
import { PaginaAgenda } from '@/paginas/agenda'
import {
  PaginaAjustes,
  PaginaOdontograma,
  PaginaPaciente,
  PaginaPacientes,
  PaginaVolverDeGoogle,
} from '@/paginas/diferidas'
import { PaginaEntrar } from '@/paginas/entrar'
import { PaginaError } from '@/paginas/error'
import { LayoutApp } from '@/paginas/layout-app'
import { PaginaNoEncontrada } from '@/paginas/no-encontrada'

const raiz = createRootRoute({
  component: Outlet,
  notFoundComponent: PaginaNoEncontrada,
})

// Con sesión, "Entrar" lleva a donde se iba (o a la agenda).
const entrar = createRoute({
  getParentRoute: () => raiz,
  path: '/entrar',
  beforeLoad: async ({ location }) => {
    if (await sesionActual()) {
      const siguiente = new URLSearchParams(location.searchStr).get('siguiente')
      throw redirect({ href: rutaInternaSegura(siguiente), replace: true })
    }
  },
  component: PaginaEntrar,
})

const volverDeGoogle = createRoute({
  getParentRoute: () => raiz,
  path: '/auth/callback',
  component: PaginaVolverDeGoogle,
})

// Todo lo demás pide sesión. Sin sesión, va a "Entrar" y después vuelve.
// Es un control de la interfaz: los datos los protege RLS en Postgres.
const app = createRoute({
  getParentRoute: () => raiz,
  id: 'app',
  beforeLoad: async ({ location }) => {
    if (!(await sesionActual())) {
      const destino = location.pathname === '/' ? '' : location.pathname + location.searchStr
      throw redirect({
        href: destino ? `/entrar?siguiente=${encodeURIComponent(destino)}` : '/entrar',
        replace: true,
      })
    }
  },
  component: LayoutApp,
  errorComponent: PaginaError,
})

const agenda = createRoute({ getParentRoute: () => app, path: '/', component: PaginaAgenda })
const pacientes = createRoute({
  getParentRoute: () => app,
  path: '/pacientes',
  component: PaginaPacientes,
})
const paciente = createRoute({
  getParentRoute: () => app,
  path: '/pacientes/$id',
  component: PaginaPaciente,
})
const odontograma = createRoute({
  getParentRoute: () => app,
  path: '/pacientes/$id/odontograma',
  component: PaginaOdontograma,
})
const ajustes = createRoute({
  getParentRoute: () => app,
  path: '/ajustes',
  component: PaginaAjustes,
})

const arbol = raiz.addChildren([
  entrar,
  volverDeGoogle,
  app.addChildren([agenda, pacientes, paciente, odontograma, ajustes]),
])

export const router = createRouter({
  routeTree: arbol,
  // Parámetros de la URL como texto plano (?fecha=2026-11-19&cita=…), igual
  // que antes: los enlaces compartidos siguen sirviendo.
  parseSearch: (texto) => Object.fromEntries(new URLSearchParams(texto)),
  stringifySearch: (parametros) => {
    const texto = new URLSearchParams(
      Object.entries(parametros).filter((e): e is [string, string] => typeof e[1] === 'string'),
    ).toString()
    return texto ? `?${texto}` : ''
  },
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

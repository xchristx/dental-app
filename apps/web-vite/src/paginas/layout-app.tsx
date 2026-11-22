import { Outlet } from '@tanstack/react-router'
import { ToothIcon } from '@phosphor-icons/react'
import { NavegacionInferior, NavegacionLateral } from '@/components/navegacion'
import { SesionUsuario } from '@/components/sesion-usuario'
import { ES_DEMO } from '@/lib/supabase/config'

// Estructura de la app (decisión 0009): barra lateral desde `lg`,
// barra inferior fija en celular y tablet.
// El router exige la sesión; los datos los protege RLS.
export function LayoutApp() {
  return (
    <div className="flex flex-1">
      <aside className="border-border bg-card sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r px-3 py-6 lg:flex">
        <p className="flex items-center gap-2 px-3 font-medium">
          <ToothIcon weight="bold" className="size-5" />
          Sifel
        </p>
        <nav aria-label="Secciones">
          <NavegacionLateral />
        </nav>
        <div className="mt-auto">
          <SesionUsuario />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {ES_DEMO && (
          <p className="bg-warning-bg text-warning px-4 py-2 text-center text-sm font-medium">
            Demo · datos inventados
          </p>
        )}
        <Outlet />
      </div>

      <nav
        aria-label="Secciones"
        className="border-border bg-card fixed inset-x-0 bottom-0 z-10 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <NavegacionInferior />
      </nav>
    </div>
  )
}

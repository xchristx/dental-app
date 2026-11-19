import { ToothIcon } from '@phosphor-icons/react/ssr'
import { NavegacionInferior, NavegacionLateral } from '@/components/navegacion'

// Estructura de la app (decisión 0009): barra lateral desde `lg`,
// barra inferior fija en celular y tablet.
export default function AppLayout({ children }: LayoutProps<'/'>) {
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
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

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SesionUsuario } from '@/components/sesion-usuario'

export const metadata: Metadata = { title: 'Ajustes' }

// Página provisoria: lugares y horarios de atención llegan con el MVP 1.
export default function AjustesPage() {
  return (
    <main className="flex w-full max-w-3xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-medium">Ajustes</h1>
        <p className="text-muted-foreground mt-2">
          Aquí vas a cargar tus lugares de trabajo y tus horarios de atención.
        </p>
      </div>

      {/* En celular y tablet no hay barra lateral: "Salir" está aquí. */}
      <section className="max-w-xs lg:hidden">
        <h2 className="mb-3 font-medium">Tu sesión</h2>
        <Suspense>
          <SesionUsuario />
        </Suspense>
      </section>
    </main>
  )
}

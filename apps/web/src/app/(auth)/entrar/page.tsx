import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ToothIcon } from '@phosphor-icons/react/ssr'
import { ES_DEMO, GOOGLE_HABILITADO } from '@/lib/supabase/config'
import { FormularioEntrar } from './formulario-entrar'

export const metadata: Metadata = { title: 'Entrar' }

export default function EntrarPage({ searchParams }: PageProps<'/entrar'>) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <ToothIcon weight="bold" className="size-8" />
        <div>
          <h1 className="font-heading text-3xl leading-[1.1] tracking-[-0.02em]">Sifel</h1>
          <p className="text-muted-foreground">Agenda dental</p>
        </div>
        {ES_DEMO && (
          <p className="bg-warning-bg text-warning rounded-full px-3 py-1 text-sm font-medium">
            Demo · datos inventados
          </p>
        )}
      </header>

      {/* Lee ?siguiente y ?error de la URL: va dentro de Suspense (Cache Components). */}
      <Suspense>
        <FormularioEntrar
          parametros={searchParams}
          esDemo={ES_DEMO}
          googleHabilitado={GOOGLE_HABILITADO}
        />
      </Suspense>
    </main>
  )
}

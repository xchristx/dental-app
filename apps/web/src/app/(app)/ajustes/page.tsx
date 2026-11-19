import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Horarios } from '@/components/ajustes/horarios'
import { Lugares } from '@/components/ajustes/lugares'
import { SesionUsuario } from '@/components/sesion-usuario'
import { datosDeAjustes } from '@/lib/ajustes/datos'

export const metadata: Metadata = { title: 'Ajustes' }

// Lo que se carga una vez para que la agenda funcione: lugares y horarios (0004).
export default function AjustesPage() {
  return (
    <main className="flex w-full max-w-3xl flex-col gap-10 px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-2xl font-medium">Ajustes</h1>

      <Suspense fallback={<EsqueletoAjustes />}>
        <ContenidoAjustes />
      </Suspense>

      {/* En celular y tablet no hay barra lateral: "Salir" está aquí. */}
      <section className="max-w-xs lg:hidden">
        <h2 className="mb-3 text-lg font-medium">Tu sesión</h2>
        <Suspense>
          <SesionUsuario />
        </Suspense>
      </section>
    </main>
  )
}

async function ContenidoAjustes() {
  const datos = await datosDeAjustes()
  return (
    <>
      <Lugares lugares={datos.lugares} />
      <Horarios datos={datos} />
    </>
  )
}

// Formas grises fijas, sin animación (docs/diseno.md).
function EsqueletoAjustes() {
  return (
    <div aria-busy="true" aria-label="Cargando los ajustes" className="flex flex-col gap-10">
      <div className="bg-muted h-40 rounded-lg" />
      <div className="bg-muted h-72 rounded-lg" />
    </div>
  )
}

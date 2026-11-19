import type { Metadata } from 'next'
import { Suspense } from 'react'
import { connection } from 'next/server'
import { fechaEnZona } from '@dental/core'
import { FormularioPaciente } from '@/components/pacientes/formulario-paciente'
import { ListaPacientes } from '@/components/pacientes/lista-pacientes'
import { ZONA } from '@/lib/agenda/zona'
import { listaDePacientes } from '@/lib/pacientes/datos'

export const metadata: Metadata = { title: 'Pacientes' }

export default function PacientesPage() {
  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-medium">Pacientes</h1>
        <FormularioPaciente />
      </header>

      <Suspense fallback={<EsqueletoLista />}>
        <Lista />
      </Suspense>
    </main>
  )
}

async function Lista() {
  const pacientes = await listaDePacientes()
  // La edad depende de la fecha de hoy en La Paz: se calcula en cada request.
  await connection()
  return <ListaPacientes pacientes={pacientes} hoy={fechaEnZona(new Date(), ZONA)} />
}

// Formas grises fijas, sin animación (docs/diseno.md).
function EsqueletoLista() {
  return (
    <div aria-busy="true" aria-label="Cargando pacientes" className="flex flex-col gap-3">
      <div className="bg-muted h-11 rounded-sm" />
      <div className="bg-muted h-80 rounded-lg" />
    </div>
  )
}

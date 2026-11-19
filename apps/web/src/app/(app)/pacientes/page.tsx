import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pacientes' }

// Página provisoria: la lista de pacientes llega con el MVP 1.
export default function PacientesPage() {
  return (
    <main className="w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-2xl font-medium">Pacientes</h1>
      <p className="text-muted-foreground mt-2">Todavía no hay pacientes.</p>
    </main>
  )
}

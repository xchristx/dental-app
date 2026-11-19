import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ajustes' }

// Página provisoria: lugares y horarios de atención llegan con el MVP 1.
export default function AjustesPage() {
  return (
    <main className="w-full max-w-3xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-2xl font-medium">Ajustes</h1>
      <p className="text-muted-foreground mt-2">
        Aquí vas a cargar tus lugares de trabajo y tus horarios de atención.
      </p>
    </main>
  )
}

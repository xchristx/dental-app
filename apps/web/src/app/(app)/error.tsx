'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

// Si la base no responde (por ejemplo, el proyecto gratis de Supabase está en
// pausa, decisión 0011), se muestra esto en vez de un error genérico.
export default function ErrorApp({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex w-full max-w-md flex-col gap-4 px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-2xl font-medium">No pudimos cargar tus datos</h1>
      <p className="text-muted-foreground">
        Puede ser un problema de conexión, o que la base de datos esté en pausa. Si vuelve a pasar
        en unos minutos, avísale a quien administra la agenda.
      </p>
      <Button variant="outline" className="self-start" onClick={() => retry()}>
        Intentar de nuevo
      </Button>
    </main>
  )
}

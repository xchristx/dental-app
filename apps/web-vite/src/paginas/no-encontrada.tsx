import { useEffect } from 'react'
import { Enlace } from '@/components/enlace'
import { Button } from '@/components/ui/button'
import { tituloDePagina } from '@/lib/navegacion'

export function PaginaNoEncontrada() {
  useEffect(() => tituloDePagina('No encontrada'), [])
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-medium">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        Puede que el enlace esté mal o que lo que buscabas ya no exista.
      </p>
      <Button asChild variant="outline" className="self-start">
        <Enlace href="/">Ir a la agenda</Enlace>
      </Button>
    </main>
  )
}

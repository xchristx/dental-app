import { CalendarPlusIcon } from '@phosphor-icons/react/ssr'
import { calcularLlegada, formatearLlegada } from '@dental/core'
import { Button } from '@/components/ui/button'

// Página provisoria: comprueba que los tokens, las fuentes, Phosphor y
// @dental/core funcionan juntos. Datos inventados.
const cita = {
  paciente: 'Paciente de prueba',
  tipo: 'Control',
  lugar: 'Consultorio',
  inicio: new Date('2026-11-24T14:00:00Z'),
  llegada: new Date('2026-11-24T14:25:00Z'),
}

export default function Home() {
  const llegada = formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl leading-[1.1] tracking-[-0.02em]">
        Martes 24 de noviembre
      </h1>

      <article className="border-l-lugar-azul-fg bg-lugar-azul rounded-lg border-l-[3px] p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-medium">{cita.paciente}</p>
          <p className="text-muted-foreground text-sm tabular-nums">10:00 – 11:00</p>
        </div>
        <p className="text-lugar-azul-fg text-sm">
          {cita.tipo} · {cita.lugar}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">{llegada}</p>
      </article>

      <Button size="lg" className="mt-auto">
        <CalendarPlusIcon weight="bold" />
        Agendar
      </Button>
    </main>
  )
}

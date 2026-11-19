import { calcularLlegada, formatearHora, formatearLlegada, type EstadoCita } from '@dental/core'
import { ZONA, type CitaAgenda, type ColorLugar } from '@/lib/agenda/datos'
import { cn } from '@/lib/utils'

// Clases completas para que Tailwind las encuentre (docs/diseno.md, color por lugar).
const estiloLugar: Record<ColorLugar, { bloque: string; texto: string }> = {
  azul: { bloque: 'bg-lugar-azul border-l-lugar-azul-fg', texto: 'text-lugar-azul-fg' },
  verde: { bloque: 'bg-lugar-verde border-l-lugar-verde-fg', texto: 'text-lugar-verde-fg' },
  amarillo: {
    bloque: 'bg-lugar-amarillo border-l-lugar-amarillo-fg',
    texto: 'text-lugar-amarillo-fg',
  },
  morado: { bloque: 'bg-lugar-morado border-l-lugar-morado-fg', texto: 'text-lugar-morado-fg' },
  terracota: {
    bloque: 'bg-lugar-terracota border-l-lugar-terracota-fg',
    texto: 'text-lugar-terracota-fg',
  },
  gris: { bloque: 'bg-lugar-gris border-l-lugar-gris-fg', texto: 'text-lugar-gris-fg' },
}

// `atendida` no lleva badge (se muestra la llegada) y `cancelada` se ve tachada.
const badges: Partial<Record<EstadoCita, { texto: string; clase: string }>> = {
  agendada: { texto: 'Agendada', clase: 'bg-card text-muted-foreground' },
  confirmada: { texto: 'Confirmada', clase: 'bg-lugar-verde text-lugar-verde-fg' },
  no_asistio: { texto: 'No asistió', clase: 'bg-destructive-bg text-destructive' },
  cancelada: { texto: 'Cancelada', clase: 'bg-card text-muted-foreground' },
}

export function BloqueCita({ cita }: { cita: CitaAgenda }) {
  const estilo = estiloLugar[cita.lugar.color]
  const badge = badges[cita.estado]
  const esBloqueo = cita.paciente === null
  const cancelada = cita.estado === 'cancelada'

  return (
    <article
      className={cn(
        'rounded-lg border-l-[3px] p-3 md:p-2 xl:p-3',
        estilo.bloque,
        cancelada && 'opacity-50',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-muted-foreground text-sm tabular-nums">
          {formatearHora(cita.inicio, ZONA)} – {formatearHora(cita.fin, ZONA)}
        </p>
        {badge && (
          <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-medium', badge.clase)}>
            {badge.texto}
          </span>
        )}
      </div>
      <p className={cn('mt-1 leading-snug font-medium', cancelada && 'line-through')}>
        {esBloqueo ? (cita.nota ?? 'Ocupada') : cita.paciente}
      </p>
      <p className={cn('text-sm', estilo.texto)}>
        {esBloqueo ? 'Bloqueo' : (cita.tipo ?? 'Cita')} · {cita.lugar.nombre}
      </p>
      {cita.otraProfesional && (
        <p className="text-muted-foreground text-sm">{cita.otraProfesional}</p>
      )}
      {cita.estado === 'atendida' && cita.llegada && (
        <p className="text-muted-foreground mt-1 text-sm">
          {formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))}
        </p>
      )}
    </article>
  )
}

import { WarningIcon } from '@phosphor-icons/react'
import { resumenAlergias } from '@dental/core'
import type { Anamnesis } from '@/lib/historia/datos'
import { cn } from '@/lib/utils'

/**
 * Lo primero que hay que saber antes de atender (0018): en rojo si tiene
 * alergias, como dato si no tiene alergias conocidas y como aviso si nunca
 * se preguntó.
 */
export function AvisoAlergias({
  anamnesis,
  className,
}: {
  anamnesis: Anamnesis | null
  className?: string
}) {
  const resumen = resumenAlergias(anamnesis)
  if (resumen.tipo === 'sin_alergias') {
    return <p className={cn('text-muted-foreground text-sm', className)}>Sin alergias conocidas</p>
  }
  const conAlergias = resumen.tipo === 'alergias'
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm',
        conAlergias ? 'bg-destructive-bg text-destructive' : 'bg-warning-bg text-warning',
        className,
      )}
    >
      <WarningIcon weight="bold" className="mt-0.5 size-4 shrink-0" />
      <span>
        {conAlergias ? (
          <>
            <strong className="font-medium">Alergias:</strong> {resumen.texto}
          </>
        ) : (
          'Alergias sin registrar. Pregúntale y cárgalas en la anamnesis.'
        )}
      </span>
    </p>
  )
}

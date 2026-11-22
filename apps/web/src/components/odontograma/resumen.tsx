import { useQuery } from '@tanstack/react-query'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { calcularIndices } from '@dental/core'
import { Enlace } from '@/components/enlace'
import { buttonVariants } from '@/components/ui/button'
import { consultaOdontograma } from '@/lib/odontograma/datos'

/** En la ficha del paciente: los índices, cuánto hay a tratar y el enlace al odontograma (0020). */
export function ResumenOdontograma({ pacienteId }: { pacienteId: string }) {
  const odontograma = useQuery(consultaOdontograma(pacienteId))
  const datos = odontograma.data
  const tipoDe = new Map(datos?.codigos.map((c) => [c.id, c.tipo]))
  const aTratar =
    datos?.registros.filter((r) => r.codigoId && tipoDe.get(r.codigoId) === 'hallazgo').length ?? 0
  const indices = datos && calcularIndices(datos.registros, datos.codigos)

  return (
    <section aria-labelledby="titulo-odontograma" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-odontograma" className="text-lg font-medium">
          Odontograma
        </h2>
        <Enlace
          href={`/pacientes/${pacienteId}/odontograma`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Abrir
          <ArrowRightIcon weight="bold" />
        </Enlace>
      </div>
      {indices ? (
        <p className="text-muted-foreground text-sm tabular-nums">
          {datos.registros.length === 0
            ? 'Sin registros todavía.'
            : `${aTratar === 1 ? '1 hallazgo' : `${aTratar} hallazgos`} a tratar · CPO-D ${indices.cpod.total} · ceo-d ${indices.ceod.total}`}
        </p>
      ) : (
        <p aria-busy="true" className="bg-muted h-5 w-64 rounded-sm" />
      )}
    </section>
  )
}

import { ocupaAgenda, type EstadoCita } from './estados'
import { calcularLlegada } from './llegada'

/**
 * Qué pasa si un paciente llega tarde (0013): si se lo atiende el tiempo
 * completo, la cita termina después de lo acordado. Eso puede no molestar a
 * nadie (se puede extender la cita) o atrasar la siguiente.
 */

export interface CitaDelDia {
  id: string
  profesionalId: string
  lugarId: string
  inicio: Date
  fin: Date
  estado: EstadoCita
}

export type ImpactoLlegada =
  | { tipo: 'sin_impacto' }
  | { tipo: 'se_puede_extender'; finCompleto: Date; minutosExtra: number }
  | { tipo: 'atrasa_siguiente'; finCompleto: Date; siguienteId: string; minutosRetraso: number }

const MINUTO = 60_000

/** Hasta qué hora dura la cita si se atiende completa desde que llegó. */
export function finSiSeAtiendeCompleta(cita: {
  inicio: Date
  fin: Date
  finPrevisto: Date | null
  llegada: Date
}): Date {
  // Si ya se extendió, la duración acordada es la de antes de extenderla.
  const duracion = (cita.finPrevisto ?? cita.fin).getTime() - cita.inicio.getTime()
  return new Date(Math.max(cita.llegada.getTime(), cita.inicio.getTime()) + duracion)
}

export function impactoDeLlegada(
  cita: CitaDelDia & { llegada: Date | null; finPrevisto: Date | null },
  contexto: {
    /** Citas del día; la propia cita se ignora. */
    citas: CitaDelDia[]
    controlaSillon: (lugarId: string) => boolean
    margenTrasladoMin: number
  },
): ImpactoLlegada {
  if (cita.estado !== 'atendida' || !cita.llegada) return { tipo: 'sin_impacto' }
  // Dentro de la tolerancia cuenta como a tiempo: no se molesta con avisos.
  if (calcularLlegada(cita.inicio, cita.llegada).tipo !== 'tarde') return { tipo: 'sin_impacto' }

  const finCompleto = finSiSeAtiendeCompleta({ ...cita, llegada: cita.llegada })
  if (cita.fin >= finCompleto) return { tipo: 'sin_impacto' }

  const margen = contexto.margenTrasladoMin * MINUTO
  // Las citas que vienen después y que esta puede atrasar: las de la misma
  // profesional (en otro lugar, con su traslado) y las del mismo sillón.
  const atrasadas = contexto.citas
    .filter(
      (c) =>
        c.id !== cita.id &&
        ocupaAgenda(c.estado) &&
        c.inicio >= cita.fin &&
        (c.profesionalId === cita.profesionalId ||
          (c.lugarId === cita.lugarId && contexto.controlaSillon(c.lugarId))),
    )
    .map((c) => {
      const traslado =
        c.profesionalId === cita.profesionalId && c.lugarId !== cita.lugarId ? margen : 0
      return { cita: c, retraso: finCompleto.getTime() + traslado - c.inicio.getTime() }
    })
    .filter((a) => a.retraso > 0)
    .sort((a, b) => a.cita.inicio.getTime() - b.cita.inicio.getTime())

  const siguiente = atrasadas[0]
  if (siguiente) {
    return {
      tipo: 'atrasa_siguiente',
      finCompleto,
      siguienteId: siguiente.cita.id,
      minutosRetraso: Math.ceil(siguiente.retraso / MINUTO),
    }
  }
  return {
    tipo: 'se_puede_extender',
    finCompleto,
    minutosExtra: Math.round((finCompleto.getTime() - cita.fin.getTime()) / MINUTO),
  }
}

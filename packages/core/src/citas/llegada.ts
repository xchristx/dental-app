/**
 * Cuánto antes o después llegó un paciente respecto de la hora de su cita.
 * La diferencia se calcula, nunca se guarda (decisión 0005).
 */
export type Llegada =
  { tipo: 'a_tiempo' } | { tipo: 'tarde'; minutos: number } | { tipo: 'temprano'; minutos: number }

/** Margen, en minutos, dentro del cual se considera que llegó a tiempo. */
export const TOLERANCIA_LLEGADA_MIN = 5

export function calcularLlegada(
  inicioCita: Date,
  llegada: Date,
  toleranciaMin: number = TOLERANCIA_LLEGADA_MIN,
): Llegada {
  const minutos = Math.round((llegada.getTime() - inicioCita.getTime()) / 60_000)
  if (Math.abs(minutos) <= toleranciaMin) return { tipo: 'a_tiempo' }
  return minutos > 0 ? { tipo: 'tarde', minutos } : { tipo: 'temprano', minutos: -minutos }
}

/** "25 min", "1 h", "1 h 10 min". */
export function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas} h`
  return `${horas} h ${resto} min`
}

/** Texto para la interfaz: "Llegó 25 min tarde", "Llegó 1 h 10 min antes". */
export function formatearLlegada(llegada: Llegada): string {
  switch (llegada.tipo) {
    case 'a_tiempo':
      return 'Llegó a tiempo'
    case 'tarde':
      return `Llegó ${formatearDuracion(llegada.minutos)} tarde`
    case 'temprano':
      return `Llegó ${formatearDuracion(llegada.minutos)} antes`
  }
}

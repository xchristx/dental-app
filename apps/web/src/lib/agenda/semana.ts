import { sumarDias, type Fecha } from '@dental/core'
import { queryClient } from '@/lib/consultas'
import { citasDeLaSemana, enlacesDeLaSemana, type CitaAgenda, type EnlacesReagenda } from './datos'

export interface Semana {
  lunes: Fecha
  citas: CitaAgenda[]
  enlaces: Record<string, EnlacesReagenda>
}

/** Las citas de una semana y sus enlaces de reagenda: todo lo que necesita la agenda. */
export const consultaSemana = (lunes: Fecha) => ({
  queryKey: ['semana', lunes] as const,
  queryFn: async (): Promise<Semana> => {
    const citas = await citasDeLaSemana(lunes)
    return { lunes, citas, enlaces: await enlacesDeLaSemana(citas) }
  },
})

/** Deja lista la semana anterior y la siguiente: cambiar de semana es instantáneo. */
export function precargarSemanasVecinas(lunes: Fecha) {
  for (const otra of [sumarDias(lunes, -7), sumarDias(lunes, 7)]) {
    void queryClient.prefetchQuery(consultaSemana(otra))
  }
}

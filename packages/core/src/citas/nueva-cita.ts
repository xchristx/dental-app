import { z } from 'zod'
import { esFechaValida, esHoraValida, instanteLocal } from '../fechas/fechas'

/**
 * Datos para agendar una cita o un bloqueo. Se valida igual en la web, en la
 * futura app Android y en el servidor. Los id los genera el cliente (0003).
 */
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()

const pacienteExistente = z.object({
  tipo: z.literal('existente'),
  id: z.uuid('Elige un paciente.'),
})

const pacienteNuevo = z.object({
  tipo: z.literal('nuevo'),
  id: z.uuid(),
  nombre: z.string().trim().min(2, 'Escribe el nombre del paciente.').max(120),
  telefono: texto(30),
})

// Un bloqueo no tiene paciente: "ocupada en la clínica", "trámite" (0002).
const sinPaciente = z.object({ tipo: z.literal('bloqueo') })

export const NuevaCita = z.object({
  id: z.uuid(),
  paciente: z.discriminatedUnion('tipo', [pacienteExistente, pacienteNuevo, sinPaciente]),
  profesionalId: z.uuid('Elige la profesional.'),
  lugarId: z.uuid('Elige el lugar.'),
  tipoCitaId: z.uuid().nullable(),
  fecha: z.string().refine(esFechaValida, 'Elige una fecha válida.'),
  hora: z.string().refine(esHoraValida, 'Elige una hora válida.'),
  duracionMin: z.coerce
    .number({ error: 'Elige la duración.' })
    .int()
    .min(5, 'La cita dura al menos 5 minutos.')
    .max(600, 'La cita dura como máximo 10 horas.'),
  nota: texto(500),
})
export type NuevaCita = z.infer<typeof NuevaCita>

/** Rango [inicio, fin) de la cita en instantes, a partir de la hora local. */
export function rangoDeLaCita(
  cita: Pick<NuevaCita, 'fecha' | 'hora' | 'duracionMin'>,
  zona: string,
): { inicio: Date; fin: Date } {
  const inicio = instanteLocal(cita.fecha, cita.hora, zona)
  return { inicio, fin: new Date(inicio.getTime() + cita.duracionMin * 60_000) }
}

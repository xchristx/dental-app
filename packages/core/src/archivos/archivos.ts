import { z } from 'zod'
import { ZONA_LA_PAZ, esFechaValida, fechaEnZona } from '../fechas/fechas'

// Archivos de pacientes (decisión 0027).

export const TIPOS_ARCHIVO = ['radiografia', 'foto', 'comprobante'] as const
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[number]

export const NOMBRE_TIPO_ARCHIVO: Record<TipoArchivo, string> = {
  radiografia: 'Radiografía',
  foto: 'Foto',
  comprobante: 'Comprobante',
}

export const MIME_ARCHIVO = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export type MimeArchivo = (typeof MIME_ARCHIVO)[number]

/** 10 MB, como el límite del bucket. */
export const TAMANO_MAXIMO_ARCHIVO = 10 * 1024 * 1024

/** Lado mayor de una foto al subirla: alcanza para ver una radiografía en detalle. */
export const LADO_MAXIMO_FOTO = 2000

const EXTENSION: Record<MimeArchivo, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export const esMimeArchivo = (mime: string): mime is MimeArchivo =>
  (MIME_ARCHIVO as readonly string[]).includes(mime)

/** Dónde va en el bucket: organización/paciente/archivo.ext. */
export function rutaDeArchivo(
  organizacionId: string,
  pacienteId: string,
  id: string,
  mime: MimeArchivo,
): string {
  return `${organizacionId}/${pacienteId}/${id}.${EXTENSION[mime]}`
}

/** Medidas para achicar una foto sin deformarla. Si ya es chica, no cambia. */
export function medidasAchicadas(
  ancho: number,
  alto: number,
  maximo = LADO_MAXIMO_FOTO,
): { ancho: number; alto: number } {
  const escala = Math.min(1, maximo / Math.max(ancho, alto))
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) }
}

/** "350 KB" o "1,2 MB". */
export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/**
 * Un archivo nuevo: de la ficha, la imagen de una Rx o el comprobante de un
 * pago (0029). Lo ligado a una Rx es una radiografía; un comprobante va con su pago.
 */
export const DatosArchivo = z
  .object({
    id: z.uuid(),
    pacienteId: z.uuid(),
    tipo: z.enum(TIPOS_ARCHIVO, 'Elige si es una radiografía o una foto.'),
    rxId: z.uuid().nullable().default(null),
    movimientoId: z.uuid().nullable().default(null),
    mime: z.enum(MIME_ARCHIVO, 'Ese formato no se puede subir. Usa una foto (JPG o PNG) o un PDF.'),
    bytes: z
      .number()
      .int()
      .positive('El archivo está vacío.')
      .max(TAMANO_MAXIMO_ARCHIVO, 'El archivo pesa más de 10 MB.'),
    nota: z
      .string()
      .trim()
      .max(200, 'Máximo 200 caracteres.')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
    fecha: z
      .string()
      .refine(esFechaValida, 'Elige una fecha válida.')
      .refine((v) => v <= fechaEnZona(new Date(), ZONA_LA_PAZ), 'La fecha no puede ser futura.'),
  })
  .refine((a) => a.rxId === null || a.tipo === 'radiografia', 'Lo de una Rx es una radiografía.')
  .refine(
    (a) => (a.tipo === 'comprobante') === (a.movimientoId !== null),
    'Un comprobante va con su pago.',
  )
export type DatosArchivo = z.infer<typeof DatosArchivo>

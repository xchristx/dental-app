import { medidasAchicadas, esMimeArchivo, type MimeArchivo } from '@dental/core'

/**
 * Prepara un archivo para subirlo (0027): una foto se achica a 2000 px de
 * lado mayor y se pasa a JPEG; un PDF va tal cual. Devuelve null si no es
 * una imagen que el navegador pueda leer ni un PDF.
 */
export async function prepararArchivo(
  archivo: File,
): Promise<{ contenido: Blob; mime: MimeArchivo } | null> {
  if (archivo.type === 'application/pdf') return { contenido: archivo, mime: 'application/pdf' }
  if (!archivo.type.startsWith('image/')) return null

  let imagen: ImageBitmap
  try {
    // Respeta la orientación de la foto del celular (EXIF).
    imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
  } catch {
    // Un formato que el navegador no lee (por ejemplo, HEIC en Chrome): se
    // sube tal cual solo si el bucket lo acepta.
    return esMimeArchivo(archivo.type) ? { contenido: archivo, mime: archivo.type } : null
  }

  const { ancho, alto } = medidasAchicadas(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = ancho
  lienzo.height = alto
  const contexto = lienzo.getContext('2d')
  if (!contexto) {
    imagen.close()
    return esMimeArchivo(archivo.type) ? { contenido: archivo, mime: archivo.type } : null
  }
  // Fondo blanco: un PNG con transparencia no queda negro en JPEG.
  contexto.fillStyle = '#ffffff'
  contexto.fillRect(0, 0, ancho, alto)
  contexto.drawImage(imagen, 0, 0, ancho, alto)
  imagen.close()

  const jpeg = await new Promise<Blob | null>((resolver) =>
    lienzo.toBlob(resolver, 'image/jpeg', 0.85),
  )
  if (!jpeg) return esMimeArchivo(archivo.type) ? { contenido: archivo, mime: archivo.type } : null
  // Si achicar no ayudó (una imagen ya liviana), se sube la original.
  if (jpeg.size >= archivo.size && esMimeArchivo(archivo.type)) {
    return { contenido: archivo, mime: archivo.type }
  }
  return { contenido: jpeg, mime: 'image/jpeg' }
}

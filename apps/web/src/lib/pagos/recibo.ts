import {
  enlaceWhatsApp,
  filasDelRecibo,
  mensajeRecibo,
  nombreArchivoRecibo,
  numeroDeRecibo,
  type DatosRecibo,
} from '@dental/core'

// Recibo en PDF por WhatsApp (0028). pdf-lib se carga recién al generar el
// primero, para no sumar peso al resto de la app.

/** pdf-lib escribe con Helvetica (WinAnsi): el signo menos "−" no existe ahí. */
const paraPdf = (texto: string) => texto.replace(/−/g, '-')

export async function generarPdfRecibo(d: DatosRecibo): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Recibo ${numeroDeRecibo(d.numero)}`)
  pdf.setCreator('Sifel')
  // A5 vertical: se lee bien en el celular y se puede imprimir.
  const pagina = pdf.addPage([420, 595])
  const normal = await pdf.embedFont(StandardFonts.Helvetica)
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold)
  const gris = rgb(0.43, 0.43, 0.41)
  const margen = 36
  let y = 595 - margen

  const linea = (texto: string, opciones: { tamano?: number; fuente?: typeof normal } = {}) => {
    const tamano = opciones.tamano ?? 11
    pagina.drawText(paraPdf(texto), {
      x: margen,
      y: (y -= tamano + 6),
      size: tamano,
      font: opciones.fuente ?? normal,
    })
  }

  linea(d.consultorio, { tamano: 16, fuente: negrita })
  linea(`Recibo ${numeroDeRecibo(d.numero)}`, { tamano: 13 })
  y -= 10
  pagina.drawLine({
    start: { x: margen, y },
    end: { x: 420 - margen, y },
    thickness: 0.5,
    color: gris,
  })
  y -= 8

  for (const [etiqueta, valor] of filasDelRecibo(d)) {
    y -= 20
    pagina.drawText(etiqueta, { x: margen, y, size: 10, font: normal, color: gris })
    // El valor va a la derecha de la etiqueta; "Son" puede ser largo: se parte.
    const ancho = 420 - margen * 2 - 110
    const palabras = paraPdf(valor).split(' ')
    let renglon = ''
    for (const palabra of palabras) {
      const prueba = renglon ? `${renglon} ${palabra}` : palabra
      if (normal.widthOfTextAtSize(prueba, 11) > ancho && renglon) {
        pagina.drawText(renglon, { x: margen + 110, y, size: 11, font: negrita })
        y -= 15
        renglon = palabra
      } else {
        renglon = prueba
      }
    }
    pagina.drawText(renglon, { x: margen + 110, y, size: 11, font: negrita })
  }

  y -= 40
  pagina.drawText('Este recibo no es una factura.', {
    x: margen,
    y,
    size: 9,
    font: normal,
    color: gris,
  })

  const bytes = await pdf.save()
  return new Blob([bytes as BlobPart], { type: 'application/pdf' })
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.click()
  // Un momento para que el navegador empiece la descarga.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function descargarRecibo(d: DatosRecibo) {
  descargar(await generarPdfRecibo(d), nombreArchivoRecibo(d.numero))
}

/** El enlace de WhatsApp con el texto del recibo, al número del paciente si lo hay. */
export const enlaceRecibo = (d: DatosRecibo, telefono: string | null) =>
  enlaceWhatsApp(telefono, mensajeRecibo(d)) ??
  `https://wa.me/?text=${encodeURIComponent(mensajeRecibo(d))}`

/**
 * Manda el recibo (0028). Con el menú de compartir del sistema (el celular),
 * va el PDF con el texto. Si no se puede compartir archivos, descarga el PDF y
 * abre WhatsApp con el texto para el número del paciente, para adjuntarlo. El
 * navegador puede bloquear esa ventana (no es un clic directo): la interfaz
 * muestra además el enlace.
 */
export async function enviarRecibo(
  d: DatosRecibo,
  telefono: string | null,
): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const blob = await generarPdfRecibo(d)
  const archivo = new File([blob], nombreArchivoRecibo(d.numero), { type: 'application/pdf' })
  const mensaje = mensajeRecibo(d)

  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], text: mensaje })
      return 'compartido'
    } catch (error) {
      // Cerró el menú sin elegir: no es un error.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelado'
    }
  }

  descargar(blob, archivo.name)
  window.open(enlaceRecibo(d, telefono), '_blank', 'noopener,noreferrer')
  return 'descargado'
}

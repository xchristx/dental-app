// Clases compartidas por los formularios de la historia clínica.

export const claseCampo =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

/**
 * Área de texto que crece con lo escrito (`field-sizing: content`), entre 3 y
 * 12 líneas. Donde el navegador no lo soporta, queda con 3 líneas y scroll.
 */
export const claseAreaTexto =
  'border-input bg-card field-sizing-content min-h-[calc(3lh+1.5rem)] max-h-[calc(12lh+1.5rem)] w-full rounded-sm border px-3 py-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

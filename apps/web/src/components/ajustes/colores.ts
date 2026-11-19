import type { ColorLugar } from '@dental/core'

// Clases completas para que Tailwind las encuentre (docs/diseno.md, color por lugar).
export const COLOR: Record<ColorLugar, { nombre: string; fondo: string; punto: string }> = {
  azul: { nombre: 'Azul', fondo: 'bg-lugar-azul', punto: 'bg-lugar-azul-fg' },
  verde: { nombre: 'Verde', fondo: 'bg-lugar-verde', punto: 'bg-lugar-verde-fg' },
  amarillo: { nombre: 'Amarillo', fondo: 'bg-lugar-amarillo', punto: 'bg-lugar-amarillo-fg' },
  morado: { nombre: 'Morado', fondo: 'bg-lugar-morado', punto: 'bg-lugar-morado-fg' },
  terracota: { nombre: 'Terracota', fondo: 'bg-lugar-terracota', punto: 'bg-lugar-terracota-fg' },
  gris: { nombre: 'Gris', fondo: 'bg-lugar-gris', punto: 'bg-lugar-gris-fg' },
}

export const claseCampo =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

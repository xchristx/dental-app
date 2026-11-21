import type { MetadataRoute } from 'next'

// Para instalar la app en el celular (decisión 0001: se instala como PWA).
// Colores de docs/diseno.md: fondo #F7F6F3 y acción #111111 (el ícono).
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Identidad estable de la app instalada, aparte de la URL de inicio.
    id: '/',
    name: 'Sifel · Agenda dental',
    short_name: 'Sifel',
    description: 'Agenda en varios lugares, historia clínica y pagos en cuotas.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f7f6f3',
    theme_color: '#f7f6f3',
    icons: [
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/iconos/icono-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

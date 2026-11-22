import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cada despliegue de Netlify tiene su id. Si una pestaña abierta antes de
  // desplegar navega y el servidor ya es otro, Next recarga la página entera en
  // vez de mezclar el JavaScript nuevo con el CSS viejo. En local no hace falta.
  deploymentId: process.env.DEPLOY_ID,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    staleTimes: {
      // Los datos (citas, pacientes) se piden siempre: nunca se muestran viejos.
      dynamic: 0,
      // Lo precargado de cada página (encabezado y esqueleto, sin datos) se
      // reutiliza 30 minutos y no 5. Así, al volver a la app después de un rato,
      // las secciones abren al instante con el esqueleto mientras llegan los datos.
      static: 1800,
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig

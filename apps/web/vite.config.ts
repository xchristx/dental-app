import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// SPA estática (decisión 0017): Netlify publica `dist` y redirige todas las
// rutas a index.html.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), tailwindcss(), preconectar(env.VITE_SUPABASE_URL)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      rolldownOptions: {
        output: {
          // Las librerías van en archivos propios. Cambian mucho menos que el
          // código de la app, así que después de un despliegue el navegador
          // las sigue teniendo en caché y solo baja lo que cambió.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              { name: 'supabase', test: /node_modules[\\/](@supabase|iceberg-js|tslib)[\\/]/ },
              { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
              { name: 'zod', test: /node_modules[\\/]zod[\\/]/ },
            ],
          },
        },
      },
    },
  }
})

/**
 * Abre la conexión con Supabase (DNS y TLS) mientras se descarga el
 * JavaScript, en vez de esperar a la primera consulta. `crossorigin` hace
 * falta porque supabase-js usa `fetch` con CORS, que no reutiliza una
 * conexión abierta sin ese atributo. Sin la variable (por ejemplo, el build
 * del CI) no agrega nada.
 */
function preconectar(url: string | undefined): Plugin {
  return {
    name: 'preconectar-supabase',
    transformIndexHtml: () =>
      url
        ? [
            {
              tag: 'link',
              attrs: { rel: 'preconnect', href: new URL(url).origin, crossorigin: '' },
              injectTo: 'head',
            },
          ]
        : [],
  }
}

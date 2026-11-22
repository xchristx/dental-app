# 0010: Hosting de la web en Netlify

- **Fecha:** 2026-11-19
- **Estado:** aceptada. La web sigue en Netlify, pero desde la [0017](0017-spa-con-vite.md) es un sitio estático: ya no usa el adaptador de Next ni funciones de servidor.
- **Reemplaza:** la parte de "Despliegue" de la 0006, que elegía Vercel. El resto de la 0006 sigue vigente.

## Contexto

La 0006 eligió Vercel sin comparar con otras opciones. Al revisarlo apareció un problema de costo:

- El plan gratis de Vercel (Hobby) es solo para uso personal y no comercial. Una app que la dentista usa para atender en su consultorio apoya un negocio, así que producción necesitaría el plan Pro, con un costo mensual.
- Ese costo se sumaría al de Supabase Pro, que ya es obligatorio antes de cargar pacientes reales (0006).

La ventaja técnica de Vercel ya es chica:

- Desde Next.js 16.2 hay una API de adaptadores estable, hecha junto con Netlify, Cloudflare y otros.
- Netlify despliega Next.js 16 sin configuración, con un adaptador de OpenNext que prueba con cada versión de Next.
- Esta app no depende de funciones exclusivas de Vercel. Lo pesado vive en Supabase (Postgres, RLS, autenticación).

## Decisión

- La web va en **Netlify**.
- `main` se publica en producción. Cada PR genera una previsualización (_deploy preview_).
- Configuración en [`apps/web/netlify.toml`](../../apps/web/netlify.toml). En el panel de Netlify:
  - _Base directory_: vacío (la raíz del repositorio).
  - _Package directory_: `apps/web`.
- Las variables de entorno se separan por contexto de Netlify:
  - `production`: el proyecto de Supabase `produccion`.
  - `deploy-preview` y `branch-deploy`: el proyecto `demo`. **Las previsualizaciones nunca apuntan a producción** (0006).
- Revisar los límites del plan gratis de Netlify antes de pasar a producción, porque los precios cambian.

## Alternativas

- **Vercel Pro:** la mejor integración con Next.js, pero con un costo mensual que esta app no necesita.
- **Cloudflare (Workers con OpenNext):** también gratis y con buenos límites. Queda como segunda opción si Netlify da problemas.

## Consecuencias

- Si alguna función de Next 16 no anda en Netlify, se puede volver a Vercel o pasar a Cloudflare sin cambiar el código de la app: solo cambia la configuración del despliegue.
- El CI de GitHub Actions sigue igual. Netlify solo construye y publica.

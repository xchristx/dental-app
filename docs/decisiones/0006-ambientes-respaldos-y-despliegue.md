# 0006: Ambientes, respaldos, despliegue y tests

- **Fecha:** 2026-11-19
- **Estado:** aceptada. La parte de "Despliegue" está reemplazada por la [0010](0010-hosting-netlify.md) (Netlify en lugar de Vercel). La región de producción y el paso al plan Pro están reemplazados por la [0011](0011-produccion-en-plan-gratis.md) (plan gratis con respaldos propios).

## Contexto
La app guarda historias clínicas reales y además es un portafolio que se muestra en público. Los datos reales y la demo no pueden compartir base de datos. Perder la base de datos de una dentista que dejó el papel sería grave.

## Decisión

### Ambientes
| Ambiente | Dónde | Datos |
|---|---|---|
| Local | Supabase CLI con Docker (`supabase start`) | Inventados, desde `supabase/seed.sql` |
| Demo | Proyecto de Supabase `demo` | Inventados. Se reinicia con un comando |
| Producción | Proyecto de Supabase `produccion`, en São Paulo | Reales |

- La demo tiene un usuario público ("Entrar como demo") para quien vea el portafolio.
- **Las previsualizaciones de los PR nunca apuntan a producción.** Apuntan a la demo.

### Migraciones
- Todo cambio de esquema es un archivo en `supabase/migrations/`. Nunca se edita el esquema desde el panel de Supabase.
- Se aplican a la demo y a producción desde la CLI (`supabase db push`), primero a la demo.

### Respaldos
- Producción pasa al **plan Pro** antes de cargar el primer paciente real. Incluye respaldos diarios, y el proyecto no se pausa por falta de uso. Mientras solo haya datos inventados, alcanza el plan gratis.
- Revisar el precio y lo que incluye cada plan en ese momento, porque cambian.
- Antes de cada migración que toque tablas con datos se hace un respaldo manual.

### Despliegue
- La web va en **Vercel**. `main` se publica en producción. Cada PR genera una previsualización.

### Tests
- **Vitest** para `packages/core`: huecos libres, traslados, saldos.
- **pgTAP** (`supabase test db`) para lo que vive en Postgres: restricciones de exclusión y RLS. Son la parte más crítica del MVP 1.
- **Playwright** más adelante, para el flujo completo de agendar una cita.
- **GitHub Actions** corre lint, chequeo de tipos, Vitest y pgTAP en cada PR.

## Consecuencias
- Hace falta crear el repositorio en GitHub y los dos proyectos de Supabase.
- Hay un costo mensual fijo desde que ella empieza a usarla con pacientes reales.

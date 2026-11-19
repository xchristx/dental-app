# Dental App

App de gestión para consultorios odontológicos: agenda en varios lugares, historia clínica con odontograma, y pagos en cuotas.

Se construye con una dentista real que hoy lleva todo en papel.

**Estado:** planificación. Todavía no hay código de la app.

## Documentación
- [Descubrimiento](docs/descubrimiento.md): cómo trabaja hoy la dentista y qué le complica.
- [Alcance y etapas](docs/alcance.md)
- [Preguntas pendientes](docs/preguntas-pendientes.md)
- Decisiones:
  - [0001: Stack](docs/decisiones/0001-stack.md)
  - [0002: Lugares y sillones](docs/decisiones/0002-lugares-y-sillones.md)
  - [0003: Preparado para funcionar sin conexión](docs/decisiones/0003-preparado-para-offline.md)

## Stack
TypeScript · pnpm + Turborepo · Next.js · Tailwind + shadcn/ui · Supabase (Postgres) · Zod · Expo + PowerSync (fase 2)

## Estructura (planificada)
```
apps/web        Next.js (fase 1)
apps/mobile     Expo Android, sin conexión (fase 2)
packages/core   lógica compartida: saldos, choques de agenda, odontograma
supabase/       migraciones y datos de prueba
docs/           descubrimiento, alcance y decisiones
```

## Privacidad
Este repositorio nunca guarda datos de pacientes reales. Las demos y los datos de prueba se generan con datos inventados.

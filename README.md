# Dental App

App de gestión para consultorios odontológicos: agenda en varios lugares, historia clínica con odontograma, y pagos en cuotas.

Se construye con una dentista real que hoy lleva todo en papel.

**Estado:** empezando el MVP 1 (agenda). Esquema de la base de datos listo; la interfaz todavía usa datos de prueba fijos.

**Demo:** <https://sifel.netlify.app> (datos inventados).

## Desarrollo

Requisitos: Node 24, pnpm (`corepack enable pnpm`), Docker y la CLI de Supabase.

```sh
pnpm install
pnpm dev        # web en http://localhost:3000
pnpm test       # tests de packages/core
pnpm db:start   # Supabase local
```

## Documentación

- [Descubrimiento](docs/descubrimiento.md): cómo trabaja hoy la dentista y qué le complica.
- [Alcance y etapas](docs/alcance.md)
- [Preguntas pendientes](docs/preguntas-pendientes.md)
- Decisiones:
  - [0001: Stack](docs/decisiones/0001-stack.md)
  - [0002: Lugares y sillones](docs/decisiones/0002-lugares-y-sillones.md)
  - [0003: Preparado para funcionar sin conexión](docs/decisiones/0003-preparado-para-offline.md)
  - [0004: Horarios, huecos libres y traslados](docs/decisiones/0004-horarios-y-huecos-libres.md)
  - [0005: Estados de la cita y hora de llegada](docs/decisiones/0005-estados-de-cita.md)
  - [0006: Ambientes, respaldos, despliegue y tests](docs/decisiones/0006-ambientes-respaldos-y-despliegue.md)
  - [0007: Autenticación y membresías](docs/decisiones/0007-autenticacion.md)
  - [0008: Diseño e interfaz](docs/decisiones/0008-diseno-e-interfaz.md)
  - [0009: Interfaz en celular y escritorio](docs/decisiones/0009-interfaz-en-celular-y-escritorio.md)
  - [0010: Hosting de la web en Netlify](docs/decisiones/0010-hosting-netlify.md)
  - [0011: Producción en el plan gratis de Supabase](docs/decisiones/0011-produccion-en-plan-gratis.md)
- [Guía de diseño](docs/diseno.md)

## Stack

TypeScript · pnpm + Turborepo · Next.js · Tailwind v4 + shadcn/ui · Phosphor · Supabase (Postgres) · Zod · Vitest + pgTAP · Netlify · Expo + PowerSync (fase 2)

## Estructura

```
apps/web        Next.js (fase 1)
apps/mobile     Expo Android, sin conexión (fase 2, todavía no existe)
packages/core   lógica compartida: saldos, choques de agenda, odontograma
supabase/       migraciones y datos de prueba
docs/           descubrimiento, alcance y decisiones
```

## Privacidad

Este repositorio nunca guarda datos de pacientes reales. Las demos y los datos de prueba se generan con datos inventados.

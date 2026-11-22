# Dental App

App de gestión para consultorios odontológicos: agenda en varios lugares, historia clínica con odontograma, y pagos en cuotas.

Se construye con una dentista real que hoy lleva todo en papel.

**Estado:** MVP 1 (agenda) completo: inicio de sesión, agenda (día en el celular, semana desde tablet), agendar con horarios libres y avisos, detalle de cita con estado, llegada, recordatorio por WhatsApp, reagendar y aviso de llegada tarde, pacientes y ajustes de lugares, profesionales y horarios. Antes del primer paciente real faltan los preparativos de producción de la decisión 0011.

**Demo:** <https://sifel.netlify.app> (datos inventados, se reinicia cada día). En Android se puede instalar desde el menú del navegador: "Instalar app" o "Agregar a la pantalla de inicio".

## Desarrollo

Requisitos: Node 24, pnpm (`corepack enable pnpm`), Docker y la CLI de Supabase.

```sh
pnpm install
pnpm db:start   # Supabase local, con datos inventados
cp apps/web/.env.example apps/web/.env.local
# Completar NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY con la de `supabase status`
pnpm dev        # web en http://localhost:3000
```

En local, "Entrar como demo" usa la usuaria `demo@ejemplo.test` del seed.

Tests: `pnpm test` (packages/core), `pnpm db:test` (pgTAP) y `pnpm test:e2e` (Playwright, de punta a punta).

Las pruebas de punta a punta necesitan el Supabase local levantado y Chrome instalado. Compilan la web y la levantan en el puerto 3100, o usan el servidor que ya esté en ese puerto (por ejemplo, `pnpm --filter @dental/web dev --port 3100`). Cada archivo de `apps/web/e2e/` reinicia la base local con el seed, así que no corren contra otra base. Las fechas se calculan desde hoy: el resultado no depende del día en que se corren.

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
  - [0012: Reagendar una cita](docs/decisiones/0012-reagendar.md)
  - [0013: Reglas de tiempo de una cita y llegada tarde](docs/decisiones/0013-reglas-de-tiempo-y-llegada-tarde.md)
  - [0014: Gestión de profesionales y permisos por rol](docs/decisiones/0014-gestion-de-profesionales.md)
  - [0015: La demo se reinicia cada día](docs/decisiones/0015-demo-se-reinicia-cada-dia.md)
  - [0017: La web pasa a ser una SPA con Vite](docs/decisiones/0017-spa-con-vite.md)
- [Guía de diseño](docs/diseno.md)

## Stack

TypeScript · pnpm + Turborepo · Next.js · Tailwind v4 + shadcn/ui · Phosphor · Supabase (Postgres) · Zod · Vitest + pgTAP + Playwright · Netlify · Expo + PowerSync (fase 2)

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

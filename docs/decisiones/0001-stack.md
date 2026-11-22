# 0001: Stack y estructura del proyecto

- **Fecha:** 2026-11-19
- **Estado:** aceptada. La región (São Paulo) está reemplazada por la [0011](0011-produccion-en-plan-gratis.md). Next.js está reemplazado por Vite, con la web como SPA, en la [0017](0017-spa-con-vite.md).

## Contexto
Queremos una app que sirva de portafolio y que use una dentista real. Ella usa el celular más que la laptop, y su celular es Android. Más adelante queremos una app Android que funcione sin conexión.

## Decisión
- **Monorepo con pnpm y Turborepo.**
  - `apps/web`: Next.js. Es la fase 1.
  - `apps/mobile`: Expo para Android. Es la fase 2.
  - `packages/core`: lógica compartida en TypeScript.
  - `supabase/`: migraciones y datos de prueba.
- **Web primero.** Next.js con Tailwind y shadcn/ui, pensada primero para celular. Se puede instalar como PWA.
- **Supabase** como backend: Postgres, autenticación, almacenamiento y permisos por fila (RLS). El servidor va en São Paulo.
- **Zod** para las validaciones, compartidas entre la web y la app.
- **Expo con PowerSync** para la app Android sin conexión. PowerSync guarda una base SQLite en el celular y la sincroniza con Supabase.

## Por qué Supabase y no Firebase
El intento anterior, en `D:\Projects\dental-app-2025`, usaba Firebase. Elegimos Supabase por tres motivos:
- Postgres puede **impedir en la propia base de datos** que haya citas superpuestas, con restricciones de exclusión sobre rangos de tiempo. Firestore no puede hacerlo.
- Los pagos, saldos y relaciones son datos relacionales.
- Postgres es estándar: no nos ata a un proveedor.

## Consecuencias
- La lógica de negocio (saldos, choques de agenda, catálogo del odontograma) vive en `packages/core` y no depende de ninguna interfaz.
- La app Android reutiliza esa lógica. Lo que se reescribe es solo la interfaz.

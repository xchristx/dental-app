# CLAUDE.md

## Idioma

- Responder en español.
- Los textos para la dentista (mensajes de WhatsApp, textos de la interfaz) van en **español neutro con "tú"**, sin voseo, porque ella es de Bolivia.

## Proyecto

App de gestión para una dentista real en Bolivia, que también sirve como portafolio del autor. Antes de proponer cambios, leer:

- `docs/descubrimiento.md`: cómo trabaja ella, su ficha en papel y su planilla de pagos.
- `docs/alcance.md`: las etapas (MVP 1 agenda → MVP 2 historia clínica → MVP 3 pagos).
- `docs/diseno.md`: tokens, tipografía y componentes. No se escriben colores sueltos fuera de los tokens.
- `docs/decisiones/`: las decisiones tomadas. Si algo cambia una decisión, se escribe una decisión nueva; no se edita en silencio la anterior.

## Reglas del modelo de datos

- Todo lleva `organization_id`, con permisos por fila (RLS) en Supabase.
- Identificadores UUID generados en el cliente. Todas las tablas tienen `created_at`, `updated_at` y `deleted_at` (borrado suave).
- Pagos de solo agregar. El saldo se calcula, nunca se guarda.
- Montos como enteros en centavos (`bigint`) más la moneda (`BOB`).
- Fechas en `timestamptz`, mostradas en `America/La_Paz`.
- Los choques de agenda se impiden en Postgres con restricciones de exclusión, según la profesional y según el lugar con `controla_sillon`. Solo cuentan las citas `agendada`, `confirmada` y `atendida`.
- Los horarios de atención se guardan como `time` local (es la única excepción a `timestamptz`).
- Los códigos del odontograma salen de un catálogo editable, nunca se escriben fijos en el código.

## Privacidad

Nunca guardar en el repositorio datos ni imágenes de pacientes reales. Los datos de prueba siempre son inventados.

## Comandos

Monorepo con pnpm y Turborepo. Todo se corre desde la raíz.

- `pnpm dev`: la web en <http://localhost:5173>.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
- `pnpm format`: formatea con Prettier. CI corre `pnpm format:check`.
- `pnpm --filter @dental/core test:watch`: tests de la lógica compartida en modo watch.
- `pnpm db:start` / `pnpm db:stop`: Supabase local (requiere Docker).
- `pnpm db:reset`: aplica las migraciones de `supabase/migrations/` y carga `supabase/seed.sql`.
- `pnpm db:test`: tests pgTAP de `supabase/tests/`.
- `pnpm test:e2e`: pruebas de punta a punta con Playwright (necesita el Supabase local y Chrome). Cada archivo reinicia la base local con el seed.
- `pnpm --filter @dental/web guia`: regenera la guía de uso para la dentista (`docs/guia/guia-sifel.pdf`) con capturas del Supabase local y el seed. Los textos están en `apps/web/guia/guia.html`; cuando cambia algo que ella ve, se actualiza la guía.
- `supabase migration new <nombre>`: crea una migración. Nunca se cambia el esquema desde el panel de Supabase.
- Producción (0030) solo se toca con el workflow "Publicar en producción" (respaldo, migraciones sin seed y rama `produccion`). Nunca se corre `db reset` ni el seed contra producción. Guía: `docs/operacion/produccion.md`.

## Convenciones de código

- `packages/core` (`@dental/core`) no depende de React ni de Supabase. Lo que use la web y después la app Android va ahí.
- La web es una SPA con Vite, TanStack Router y TanStack Query (0017). Habla directo con Supabase desde el navegador, sin servidor propio. Las reglas que no se pueden saltear van en Postgres (RLS, triggers, restricciones); lo que valida la interfaz es solo para avisar antes.
- Componentes de shadcn/ui: `pnpm dlx shadcn@latest add <componente>` dentro de `apps/web`, y después se adaptan a `docs/diseno.md`. Íconos de `@phosphor-icons/react`.
- Trabajo de interfaz (componentes, CSS, formularios, diálogos, tablas, accesibilidad, animaciones, rendimiento en el cliente): antes de escribir código, usar la skill `modern-web-guidance` y buscar el patrón. Lo que diga se adapta a `docs/diseno.md` y a shadcn/ui; si choca con una decisión de `docs/decisiones/`, manda la decisión.

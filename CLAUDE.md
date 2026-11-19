# CLAUDE.md

## Idioma
- Responder en español.
- Los textos para la dentista (mensajes de WhatsApp, textos de la interfaz) van en **español neutro con "tú"**, sin voseo, porque ella es de Bolivia.

## Proyecto
App de gestión para una dentista real en Bolivia, que también sirve como portafolio del autor. Antes de proponer cambios, leer:
- `docs/descubrimiento.md`: cómo trabaja ella, su ficha en papel y su planilla de pagos.
- `docs/alcance.md`: las etapas (MVP 1 agenda → MVP 2 historia clínica → MVP 3 pagos).
- `docs/decisiones/`: las decisiones tomadas. Si algo cambia una decisión, se escribe una decisión nueva; no se edita en silencio la anterior.

## Reglas del modelo de datos
- Todo lleva `organization_id`, con permisos por fila (RLS) en Supabase.
- Identificadores UUID generados en el cliente. Todas las tablas tienen `created_at`, `updated_at` y `deleted_at` (borrado suave).
- Pagos de solo agregar. El saldo se calcula, nunca se guarda.
- Montos como enteros en centavos (`bigint`) más la moneda (`BOB`).
- Fechas en `timestamptz`, mostradas en `America/La_Paz`.
- Los choques de agenda se impiden en Postgres con restricciones de exclusión, según la profesional y según el lugar con `controla_sillon`.
- Los códigos del odontograma salen de un catálogo editable, nunca se escriben fijos en el código.

## Privacidad
Nunca guardar en el repositorio datos ni imágenes de pacientes reales. Los datos de prueba siempre son inventados.

## Comandos
Todavía no hay código. Cuando exista, este archivo va a listar los comandos de desarrollo, tests y migraciones.

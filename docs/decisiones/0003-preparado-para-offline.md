# 0003: Preparar el modelo para funcionar sin conexión

- **Fecha:** 2026-11-19
- **Estado:** aceptada

## Contexto

La fase 2 es una app Android sin conexión que se sincroniza con Supabase. Cambiar el modelo después cuesta caro, así que lo preparamos desde el inicio.

## Decisión

- **Identificadores UUID generados en el cliente.** No usamos identificadores autoincrementales.
- Todas las tablas tienen `created_at` y `updated_at`.
- **Borrado suave** con `deleted_at`: nunca se borran filas.
- **Pagos de solo agregar**: un pago no se edita ni se borra. Para corregir un pago se registra un movimiento de ajuste.
- **Los saldos se calculan**, no se guardan.
- **Los montos se guardan como enteros en centavos** (`bigint`), con su moneda. No usamos decimales flotantes.
- Las fechas se guardan como `timestamptz`. Se muestran en `America/La_Paz`.
- Los números de recibo correlativos se asignan en el servidor al sincronizar, no en el dispositivo.

## Consecuencias

- No hay conflictos al sincronizar pagos.
- En los demás registros, si hay un conflicto, gana la última escritura. Con una sola usuaria editando, es suficiente.

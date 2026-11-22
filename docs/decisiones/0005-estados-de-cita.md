# 0005: Estados de la cita y hora de llegada

- **Fecha:** 2026-11-19
- **Estado:** aceptada

## Contexto

El alcance listaba "confirmada, llegó tarde, no asistió", y la decisión 0002 habla de citas "canceladas". Falta definir la lista completa.

Uno de sus dos problemas principales es que los pacientes llegan mucho antes o mucho después. Con un estado "llegó tarde" se pierde cuánto tarde llegaron, y no se puede ver quién llega tarde siempre.

## Decisión

- Estados (`estado`):
  - `agendada`: estado inicial.
  - `confirmada`: el paciente respondió el recordatorio.
  - `atendida`: el paciente vino.
  - `no_asistio`: no vino.
  - `cancelada`: se canceló antes.
- **Hora real de llegada** (`llegada_at`, `timestamptz`, opcional), aparte del estado.
  - El botón "Llegó" guarda la hora actual y pasa la cita a `atendida`. La hora se puede corregir.
  - La diferencia con la hora de la cita se calcula, no se guarda. La app muestra "llegó 25 min tarde" o "llegó 40 min antes".
- `recordatorio_enviado_at` (`timestamptz`, opcional): se guarda al tocar "Enviar recordatorio". Así ella ve a quién ya le escribió.
- **Solo `agendada`, `confirmada` y `atendida` cuentan para los choques.** `cancelada` y `no_asistio` liberan el espacio. Si un paciente no viene a las 10:00, ella puede poner a otro a las 10:30.
- Reagendar no cambia la cita original: la original queda como `no_asistio` o `cancelada` y se crea una nueva. Así queda el historial.
- Un bloqueo (cita sin paciente) solo usa `agendada` y `cancelada`.

## Consecuencias

- La condición de las restricciones de exclusión es `deleted_at IS NULL AND estado IN ('agendada', 'confirmada', 'atendida')`.
- Más adelante se puede mostrar en la ficha del paciente "suele llegar 20 min tarde", o sugerirle a ella que lo cite antes.

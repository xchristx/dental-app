# 0004: Horarios de atención, huecos libres y traslados

- **Fecha:** 2026-11-19
- **Estado:** aceptada

## Contexto
El MVP 1 promete mostrar el "próximo espacio libre". Para eso no alcanza con las citas: hay que saber **cuándo y dónde atiende** cada profesional. Además, ella va a la clínica en días y horas fijos, y cargar eso a mano cada semana es justo el tipo de olvido que hoy le complica.

También se mueve entre lugares en el mismo día. Nada impide hoy agendar una cita a las 12:00 en su consultorio y otra a las 13:00 en la clínica.

## Decisión

### Horarios
- Nueva tabla `horarios`: profesional + lugar + día de la semana + hora de inicio + hora de fin, con `vigente_desde` y `vigente_hasta` (opcional).
- Un día puede tener varios tramos. Por ejemplo, consultorio de 10 a 13 h y clínica de 15 a 18 h. El almuerzo es simplemente el hueco entre dos tramos.
- Las horas se guardan como `time` local de `America/La_Paz`. Es la única excepción a la regla de `timestamptz`: un horario no es un instante, es "todos los martes a las 15:00".
- Cambiar un horario no se edita encima: se cierra el anterior con `vigente_hasta` y se crea uno nuevo. Así las semanas pasadas siguen mostrando el horario que tenían.

### Bloqueos que se repiten
- **No hacen falta en el MVP 1.** La presencia fija en la clínica es un horario, no un bloqueo. Los bloqueos quedan para lo puntual ("trámite de 9 a 11").
- Si más adelante se necesitan bloqueos que se repiten, cada repetición se guarda como una cita real, generada hacia adelante. No se guarda una regla de repetición (RRULE), porque las restricciones de exclusión solo funcionan sobre filas reales.

### Huecos libres
- Se calculan en `packages/core`: horario de la profesional en ese lugar, menos sus citas activas, menos las citas activas del lugar si `controla_sillon = true`, menos el margen de traslado.
- El cálculo es solo una sugerencia. La palabra final la tienen las restricciones de exclusión de Postgres (decisión 0002).

### Traslados
- Cada profesional tiene un `margen_traslado_min` (30 por defecto).
- Si dos citas seguidas son en lugares distintos y el espacio entre ellas es menor al margen, la app **avisa pero no bloquea**. Ella sabe si llega o no.
- Los huecos libres sí respetan el margen.

## Consecuencias
- Antes de usar la agenda hay que cargar sus horarios. Es un paso de configuración inicial que se hace una sola vez.
- Una cita fuera del horario se permite, con un aviso. A veces atiende urgencias fuera de hora.

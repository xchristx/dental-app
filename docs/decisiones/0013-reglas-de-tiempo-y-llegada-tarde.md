# 0013: Reglas de tiempo de una cita y llegada tarde

- **Fecha:** 2026-11-19
- **Estado:** aceptada
- **Completa:** la [0005](0005-estados-de-cita.md), que define los estados pero no cuándo se puede pasar a cada uno.

## Contexto

La app permitía marcar "No asistió" o "Llegó" en una cita de la semana que viene, confirmar una cita que ya pasó o mandar el recordatorio de una cita de ayer. Son errores fáciles de cometer con un toque y ensucian el historial: "No asistió" cuenta para saber quién falta, y "Llegó" para saber quién llega tarde.

Además, uno de sus dos problemas principales es que los pacientes llegan tarde y eso le desordena el día (`docs/descubrimiento.md`). La app guardaba cuánto tarde llegaron, pero no ayudaba con lo que pasa después: si se atiende al paciente completo, la cita termina más tarde y puede atrasar a la siguiente.

## Decisión

### Qué se puede marcar y cuándo

| Acción                      | Se puede                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Confirmó                    | Antes de la hora de la cita                                                           |
| Llegó                       | Desde el mismo día, aunque sea antes de la hora: hay pacientes que llegan mucho antes |
| No asistió                  | Desde la hora de la cita                                                              |
| Cancelar y deshacer         | Siempre: a veces se anota después                                                     |
| Enviar recordatorio         | Antes de la hora, si la cita está agendada o confirmada                               |
| Corregir la hora de llegada | Con una hora que no sea posterior a ahora                                             |
| Reagendar                   | Solo a un horario que todavía no pasó                                                 |
| Agendar en una hora pasada  | Se permite con un aviso ("Agendar igual"), para anotar una cita que ya ocurrió        |
| Fecha de nacimiento         | No puede ser futura                                                                   |

La interfaz solo muestra los botones que valen a esa hora. El servidor valida lo mismo y, si rechaza algo, dice por qué. Las reglas viven en `@dental/core` (`estadosSiguientes`, `motivoPorHora`, `puedeEnviarRecordatorio`).

### Llegada tarde

Al marcar "Llegó" con más de 5 minutos de retraso (la tolerancia de `calcularLlegada`), la app calcula a qué hora terminaría la cita si se atiende la duración acordada desde que llegó, y muestra el efecto:

- **Si atrasa la siguiente cita** de la misma profesional, o la del mismo sillón si el lugar controla sillón (0002), dice cuál y cuántos minutos. Si la siguiente es en otro lugar, cuenta el margen de traslado (0004). Ofrece **avisarle por WhatsApp** al siguiente paciente con el mensaje ya escrito.
- **Si no atrasa a nadie**, ofrece **extender la cita** hasta esa hora, para que la agenda muestre el tiempo real ocupado y los horarios libres no ofrezcan ese rato.
- Siempre se puede elegir **"Mantener el horario"**. La decisión clínica (acortar el tratamiento o atender completo) es de ella; la app no la toma.

El aviso desaparece cuando pasa la hora en que terminaría la cita.

### Extender una cita

- `citas.fin` sigue siendo lo que ocupa la agenda y lo que miran los choques. Al extender, el fin acordado se guarda en `citas.fin_previsto`, que solo tiene valor si la cita se extendió.
- El servidor calcula el fin nuevo; repetir el pedido no alarga la cita otra vez.
- Si el fin nuevo pisa otra cita, Postgres lo impide como cualquier otro choque.
- "Deshacer «Llegó»" también deshace la extensión.
- Al reagendar una cita extendida, se usa la duración acordada.

## Consecuencias

- Las reglas dependen de la hora del dispositivo y del servidor. Si el reloj del celular está mal, la interfaz puede mostrar un botón que el servidor después rechaza con un mensaje claro.
- Las pruebas de punta a punta dependen de la hora en que corren. Las que preparan datos los crean relativos a la hora actual.
- Más adelante, `fin_previsto` y la hora de llegada permiten ver cuánto se atrasa el día por llegadas tardes.

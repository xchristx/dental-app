# 0012: Reagendar una cita

- **Fecha:** 2026-11-19
- **Estado:** aceptada
- **Completa:** la [0005](0005-estados-de-cita.md), que ya dice que reagendar no cambia la cita original.

## Contexto
Cuando un paciente falta y después le escribe, ella lo pasa al próximo hueco libre (`docs/descubrimiento.md`). También pasa que un paciente pide cambiar la hora antes de la cita. Hasta ahora había que cancelar la cita y agendar otra, buscando de nuevo al paciente y el tipo.

La 0005 decidió que la original queda como `no_asistio` o `cancelada` y que se crea una cita nueva. Faltaba definir cuál de los dos estados, cómo se relacionan las dos citas y qué pasa si algo falla a mitad de camino.

## Decisión
- **Botón "Reagendar"** en el detalle de la cita. Abre el mismo formulario de "Agendar", con el paciente, el tipo, la duración, la profesional y la nota de la original. Propone el primer horario libre del día de la cita, o de hoy si ese día ya pasó.
- **Cómo queda la original:**
  - Si ya estaba `cancelada` o `no_asistio`, queda igual.
  - Si seguía activa y **su hora ya pasó**, queda `no_asistio`: el paciente no vino.
  - Si su hora **todavía no llegó**, queda `cancelada`: se avisó antes.

  El formulario lo dice antes de guardar ("La cita del martes 24 a las 10:00 queda como «No asistió»"). La regla vive en `@dental/core` (`estadoAlReagendar`).
- **La nueva apunta a la original** con `citas.reagendada_desde`. El detalle de cada una enlaza a la otra, y en la ficha del paciente la original dice "Reagendada".
- **Todo o nada.** La función de Postgres `reagendar_cita` libera la original y crea la nueva en una sola transacción. Si la nueva choca con otra cita, no cambia nada. Corre con los permisos de quien la llama (`security invoker`), así que RLS sigue aplicando.
- **Se puede superponer con la original.** Pasar una cita de las 10:00 a las 10:30 del mismo día funciona, porque primero se libera la original.
- **Una cita se reagenda una sola vez** (índice único sobre `reagendada_desde`). Si la nueva tampoco sirve, se reagenda la nueva. Así el historial queda como una cadena.
- **Una cita reagendada ya no se reactiva.** "Deshacer la cancelación" dejaría al paciente con dos citas. Los cambios se hacen en la nueva.
- **No se reagendan** las citas atendidas ni los bloqueos. Un bloqueo se cancela y se crea otro.
- Con el mismo id de cliente, repetir el pedido no crea otra cita (0003).

## Consecuencias
- La puntualidad del paciente (`puntualidad` en `@dental/core`) no cambia: solo cuenta citas atendidas.
- Las citas que no asistió siguen contando como `no_asistio` aunque después se reagenden. Si más adelante se quiere ver "quién falta seguido", el dato está.
- La futura app sin conexión (0003) no puede llamar a la función de Postgres sin red. Al llegar a esa fase habrá que decidir cómo se sincroniza un reagendado.

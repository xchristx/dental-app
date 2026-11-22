# 0018: Historia clínica, primera parte: anamnesis y evolución

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** el MVP 2 de [`alcance.md`](../alcance.md). El odontograma y las derivaciones quedan para después: el odontograma espera a que la dentista confirme las abreviaturas (`preguntas-pendientes.md`).

## Contexto

En papel, la historia clínica tiene en el frente los datos del paciente nuevo (antecedentes personales y familiares, alergias y medicamentos) y lo que se hizo en cada cita (`descubrimiento.md`). La app solo guardaba la ficha básica: nombre, celular y fecha de nacimiento.

Todavía no sabemos si en su ficha marca una lista de enfermedades. La foto en blanco de la ficha está pedida.

Una historia clínica en papel no se borra: si algo estaba mal, se agrega una nota. La app tiene que respetar lo mismo, sin volver incómodo corregir un error de tipeo recién escrito.

## Decisión

### Anamnesis
- **Texto libre** en cuatro secciones: antecedentes personales, antecedentes familiares, alergias y medicamentos. Más una casilla **"Sin alergias conocidas"**, que no se puede marcar si hay alergias escritas.
- **Cada vez que se guarda se crea una versión nueva**: la tabla solo admite agregar. Se muestra la última, con la fecha y quién la actualizó. Así queda el historial de lo que se sabía en cada momento, por ejemplo si una alergia se descubrió después.
- **Las alergias se destacan** en la ficha del paciente y en el detalle de la cita: en rojo si tiene alergias, como dato si no tiene alergias conocidas y como aviso si nunca se preguntó.
- Si después ella usa una lista para marcar, se agrega encima de esto, sin perder lo escrito.

### Evolución
- Una entrada por cada cosa que se hizo: **fecha, texto y quién la escribió**. Puede estar ligada a una cita del paciente (lo normal) o no (un llamado, una nota suelta).
- Se escribe desde la ficha del paciente o desde el detalle de una cita atendida.
- **Solo se corrige o se borra el mismo día**, hasta las 23:59 en La Paz, y solo quien la escribió. Después queda fija y, si hay que aclarar algo, se agrega una entrada nueva. El borrado es suave (0003).
- La fecha no puede ser futura y, si está ligada a una cita, esa cita tiene que ser del mismo paciente.

### Dónde viven las reglas
Como en la 0017, en Postgres, para que valgan también fuera de la web:
- Un trigger completa **quién la escribió** (`autor_id` y `profesional_id`) a partir de la sesión: no se puede firmar por otra persona.
- Un trigger rechaza editar una evolución de otro día o de otra persona, y una fecha futura o una cita de otro paciente. Códigos `EV001` a `EV004`.
- La anamnesis no tiene permiso de `update` ni de `delete`: solo se agregan versiones.

### Quién la ve
Todos los miembros de la organización, igual que pacientes y citas (0014). Una socia que atiende a un paciente derivado necesita sus alergias y lo que se le hizo.

## Consecuencias
- La ficha del paciente suma dos secciones (anamnesis y evolución) y el aviso de alergias arriba.
- El detalle de la cita muestra las alergias y, si está atendida, su evolución o el botón para escribirla.
- Una evolución mal escrita de un día anterior no desaparece: se corrige con una entrada nueva.
- Las versiones viejas de la anamnesis se guardan, pero por ahora no se muestran. Se puede agregar "ver cambios" si hace falta.
- Cuando el odontograma llegue, una evolución podrá decir sobre qué piezas se trabajó. Por ahora eso va en el texto.

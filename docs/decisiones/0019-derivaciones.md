# 0019: Derivaciones

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** el MVP 2 de [`alcance.md`](../alcance.md) ("derivado a" y "derivado por") y la [0018](0018-anamnesis-y-evolucion.md).

## Contexto

Los pacientes se derivan en los dos sentidos (`descubrimiento.md`):
- Ella deriva al implantólogo y a la ortodoncista, y después vuelven a ella para controles.
- Las socias le derivan pacientes para endodoncia.

Hoy eso no queda anotado en ningún lado. Cuando el paciente vuelve, no hay forma de saber quién lo mandó ni para qué. Cómo se reparte el dinero sigue fuera del alcance.

## Decisión

- Una derivación tiene **sentido**, **quién**, **motivo** y **fecha**:
  - Sentido: **recibida** ("Derivado por") o **enviada** ("Derivado a").
  - Quién: una **profesional de la organización** (las socias ya están cargadas, 0014) o **alguien de afuera**, con el nombre en texto ("Dr. Pérez, implantólogo").
  - Motivo: texto libre opcional ("Endodoncia en 46", "Evaluar implante en 36").
  - Fecha: el día de la derivación. No puede ser futura.
- Se ven y se cargan en la ficha del paciente, en una sección propia.
- **Se pueden corregir y borrar** (borrado suave, 0003). No es parte de lo que se hizo en la boca del paciente, así que no sigue la regla del mismo día de la evolución (0018).
- Como en la 0018, quién la anotó lo completa un trigger desde la sesión, y la fecha futura la rechaza Postgres (`DR001`). Todos los miembros de la organización las ven.

## Consecuencias
- Cuando un paciente vuelve, la ficha dice quién lo mandó, a quién se mandó y para qué.
- Una derivación a una socia queda ligada a su profesional: si después tiene usuario, se puede mostrar lo que le derivaron.
- No hay estado ("pendiente", "volvió"). Si hace falta seguir la vuelta del paciente, se agrega después.

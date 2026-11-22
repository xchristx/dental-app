# 0025: Editar la nota de un registro del odontograma

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** la [0020](0020-odontograma.md) y la [0021](0021-tratar-o-anular-hallazgos.md), en las que un registro solo se podía anular.

## Contexto

Un registro del odontograma lleva una nota opcional ("resina A2"), o es una nota sola sobre la pieza. Para corregir un error de tipeo en la nota, hoy hay que anular el registro y cargarlo de nuevo. Si era un tratamiento, además se pierde el vínculo con el hallazgo que trató (0021).

## Decisión

- Se puede **editar la nota** de un registro, con la misma regla que la evolución (0018): **solo quien lo cargó y solo el mismo día**, hasta las 23:59 en La Paz. Después queda fijo, y para aclarar algo se agrega una nota nueva sobre la pieza.
- Solo la nota. El código, las caras, el grado y la fecha no se editan: si están mal, se anula el registro (0021).
- Una nota sola no puede quedar vacía. Para quitarla, se anula.
- Postgres lo controla: otra persona (`OD008`) u otro día (`OD009`).

## Consecuencias

- Corregir un tipeo no rompe el vínculo de un tratamiento con su hallazgo.
- La historia de días anteriores no cambia en silencio, como en la evolución.

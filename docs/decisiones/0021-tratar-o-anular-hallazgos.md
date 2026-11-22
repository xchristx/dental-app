# 0021: Tratar o anular un hallazgo, y el plan de tratamiento

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Reemplaza:** de la [0020](0020-odontograma.md), que un hallazgo tratado se **quita**. Ahora se marca como tratado, y "quitar" pasa a llamarse **anular**, solo para los errores.

## Contexto

En la 0020, cuando se trataba un hallazgo (por ejemplo, una caries), se quitaba y se agregaba lo realizado. "Quitar" servía para dos cosas distintas: corregir un error y dar por tratado algo. En la base quedaban iguales, así que no se podía saber qué se trató ni cuándo, ni armar el plan de tratamiento.

Además, en el gráfico las caras con hallazgos y las realizadas solo se distinguían por el color (rojo o azul). Para quien no distingue bien los colores, se ven iguales (WCAG 1.4.1).

## Decisión

- **Marcar como tratado.** Desde un hallazgo, se agrega un registro realizado que lo **resuelve** (`resuelve_id`), con las mismas caras ya elegidas. Ese vínculo es explícito: la app no adivina qué código azul resuelve cuál rojo.
  - Postgres controla que lo que resuelve sea un código realizado (`OD004`) y que lo resuelto sea un hallazgo de la misma pieza y del mismo paciente (`OD005`). Un hallazgo se resuelve una sola vez.
  - El hallazgo tratado deja de dibujarse y de contar en los índices: queda lo realizado. En el panel de la pieza se sigue viendo como "Tratado el … con …".
  - Si se anula lo realizado, el hallazgo vuelve a quedar pendiente.
- **Anular** (antes "quitar") es para los errores: borrado suave, como antes.
- **Plan de tratamiento:** en la página del odontograma, la lista de los hallazgos sin tratar, por pieza, con "Marcar como tratado" en cada uno. No se guarda aparte: sale de los registros.
- **Rayas en los hallazgos:** en el gráfico, las caras con hallazgos van en rojo con rayas, y las realizadas en azul liso. La leyenda lo muestra igual.

## Consecuencias

- Queda registrado qué se trató y cuándo. Eso permite, más adelante, ver la boca en una fecha y el odontograma inicial, sin cambiar el modelo.
- El CPO-D cuenta como obturada una pieza con caries tratada con una obturación, sin tocar nada a mano.
- Un tratamiento que resuelve dos hallazgos de la misma pieza (por ejemplo, dos caries) se marca dos veces, una por cada uno.

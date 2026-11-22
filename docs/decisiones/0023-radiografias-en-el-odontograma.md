# 0023: Radiografías en el odontograma (columna Rx)

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** la [0020](0020-odontograma.md), que dejó la columna Rx esperando la pregunta 8.

## Contexto

Su ficha tiene una columna **Rx** con un ✓ en algunas piezas. Ella confirmó que el ✓ significa que **se tomó** la radiografía de esa pieza (`preguntas-pendientes.md`).

No es un hallazgo ni un tratamiento: no se dibuja en las caras, no cuenta en el CPO-D y no se "trata". Por eso no va en el catálogo de códigos (0020).

El MVP 3 trae las radiografías como archivos (`alcance.md`). Lo de ahora tiene que poder recibir el archivo después, sin cambiar lo cargado.

## Decisión

- **Una tabla aparte, `odontograma_rx`:** una fila por pieza y fecha en que se tomó la radiografía, con una nota opcional ("periapical", "de control"). Si una radiografía abarca varias piezas, se marca en cada una.
- Mismas reglas que los registros del odontograma: pieza FDI, fecha no futura (`OD003`), autor desde la sesión, permisos por organización y **anular** (borrado suave) para los errores.
- **Dónde se ve:**
  - En la **tabla**, una columna Rx con el ✓, como en papel.
  - En el **gráfico**, "Rx" escrito en gris junto a la pieza.
  - En el **panel de la pieza**, la lista de radiografías con su fecha, y "Agregar Rx" con la fecha de hoy, que se puede cambiar.
- En la **línea de tiempo** (0021) cuenta como un día con registros, y en un día anterior solo se ven las radiografías tomadas hasta entonces.
- En el MVP 3, la foto de la radiografía se agrega a la fila que ya existe.

## Consecuencias

- La columna Rx ya no espera nada: el odontograma tiene todas las columnas de su ficha.
- Los índices y el plan de tratamiento no cambian.
- Una radiografía de varias piezas son varias filas. Si en el MVP 3 se le agrega la imagen, se comparte entre esas filas.

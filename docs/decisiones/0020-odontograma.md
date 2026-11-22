# 0020: Odontograma con las normas generales

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** el MVP 2 de [`alcance.md`](../alcance.md) y la [0018](0018-anamnesis-y-evolucion.md).

## Contexto

Su ficha en papel tiene el odontograma como **tabla**, con una fila por pieza: las permanentes de 18 a 48 y las temporales de 55 a 85 en la misma fila, y un código de texto por fila, como `II-O y M y V` u `Obt-OM` (`descubrimiento.md`). Varias abreviaturas todavía esperan que ella las confirme.

Para no esperar, el autor pidió usar las **normas generales**:

- **Norma boliviana.** Las _Normas en Salud Oral_ del Ministerio de Salud (R.M. 1320, 2010) piden la nomenclatura FDI, "temporarios 51 al 85 y permanentes del 11 al 48". También piden que las historias clínicas tengan los indicadores **CPO-D** (piezas permanentes cariadas, perdidas por caries o con extracción indicada, y obturadas) y **ceo-d** (temporales cariadas, con extracción indicada y obturadas). No fijan colores ni símbolos.
- **Convención de la región.** En las normas y guías de odontograma de Latinoamérica, el **rojo** marca lo que hay que tratar (caries, extracción indicada) y el **azul** lo que ya está hecho o en buen estado (obturaciones, coronas, endodoncias). Las caras se dibujan como un cuadrado dividido en cinco.

`CLAUDE.md` pide que los códigos salgan de un catálogo editable, nunca fijos en el código.

## Decisión

### Catálogo editable de códigos

Cada organización tiene su catálogo (`odontograma_codigos`). Cada código define:

- **Abreviatura y nombre:** `C` Caries, `Obt` Obturación, `Cor` Corona…
- **Tipo:** `hallazgo` (rojo, a tratar) o `realizado` (azul, hecho o en buen estado).
- **Símbolo:** cómo se dibuja. Es una lista fija de formas de dibujo: pintar las caras, una cruz sobre la pieza, un círculo alrededor, una línea vertical (raíz), una línea horizontal o la abreviatura escrita. Las formas de dibujo son código; los códigos que las usan son datos.
- **Si va por caras** y **si lleva grado** (I a IV, como en su ficha).
- **En qué índice cuenta:** cariado, perdido u obturado, o en ninguno.

Una organización nueva empieza con un catálogo inicial armado con las normas generales:

- **Hallazgos (rojo):** caries, caries recidivante, obturación defectuosa, fractura, resto radicular, extracción indicada, endodoncia indicada, mesioversión, distoversión y giroversión.
- **Realizados (azul):** obturación, incrustación, sellante, corona, endodoncia, perdida por caries, ausente, implante y prótesis fija.

Cuando ella confirme sus abreviaturas, se cambian en el catálogo, sin tocar el código.

### Registros

- Un registro es **una pieza (FDI), un código y, si corresponde, las caras y el grado**, con una nota opcional ("resina A2") y la fecha.
- También puede ser **una nota sola sobre la pieza, sin código** ("sensibilidad al frío"). Se ve en gris, no se dibuja y no cuenta en los índices. Sin código, la nota es obligatoria.
- Las caras se guardan siempre igual (`O`, `M`, `D`, `V`, `L`) y se muestran según la pieza: incisal (`I`) en las anteriores y palatina (`P`) en las superiores.
- El odontograma muestra los registros vigentes. Cuando algo se trata, el hallazgo se **quita** (borrado suave, 0003) y se agrega lo realizado. Lo que se hizo queda en la evolución (0018).
- Postgres valida la pieza FDI, que las caras correspondan al código (`OD001`), que el grado solo vaya en los códigos con grado (`OD002`) y que la fecha no sea futura (`OD003`). El autor se completa desde la sesión.

### Vistas

- **Tabla**, como su ficha: una fila por posición, con la permanente y la temporal juntas. Una columna para los hallazgos (rojo) y otra para lo realizado (azul), escritos como en papel: `C II-OMV`, `Obt-OM`.
- **Gráfico**: el diagrama de cinco caras por pieza, con las permanentes y las temporales en su lugar, generado a partir de los mismos registros.
- Encima, el **CPO-D** y el **ceo-d** calculados. Cada pieza cuenta una sola vez: perdida antes que cariada, y cariada antes que obturada.
- Tocar una pieza (en la tabla o en el gráfico) abre sus registros, para agregar o quitar.
- El odontograma tiene su propia página (`/pacientes/:id/odontograma`). La ficha muestra el resumen y el enlace.

## Consecuencias

- El odontograma no depende de que ella confirme las abreviaturas: se ajusta el catálogo después.
- La columna **Rx** de su ficha y los datos generales (cepillado de lengua, oclusión, tártaro…) quedan para después. Rx espera la pregunta 8.
- Una anotación que abarca varias piezas (por ejemplo, "cálculo abundante de 33 a 43") se carga pieza por pieza, o como nota en la evolución.
- Los colores del dibujo son dos tokens nuevos de `docs/diseno.md`: `odontograma-rojo` y `odontograma-azul`.
- Editar el catálogo desde Ajustes llega en un cambio aparte. Mientras tanto, el catálogo inicial ya se puede usar.

# 0024: Examen bucal (datos generales de la ficha)

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** la [0020](0020-odontograma.md), que dejó para después los datos generales de la ficha.

## Contexto

La hoja del odontograma de su ficha tiene, además de la tabla, unos **datos generales** (`descubrimiento.md`):

- ¿Usa mondadientes? ¿Se cepilla la lengua?
- Oclusión, por ejemplo "mordida abierta".
- Tártaro, halitosis, placa bacteriana y materia alba.

Además, en su ficha hay anotaciones que abarcan varias piezas, como una llave de la 33 a la 43 con "cálculo abundante". La 0020 dijo que esas se cargan pieza por pieza o en la evolución.

## Decisión

- **Una tabla `examen_bucal` por versiones**, como la anamnesis (0018): cada vez que se guarda queda una versión nueva, y la vigente es la última. Así se ve cómo cambió la higiene entre controles.
- **Las preguntas son de sí o no**, con una tercera opción "sin dato" (`null`) para lo que no se preguntó: mondadientes, cepillado de lengua, tártaro, halitosis, placa bacteriana y materia alba.
- **Oclusión** es un texto corto libre, y **observaciones**, un texto más largo. Ahí va lo que abarca varias piezas ("cálculo abundante de 33 a 43"), sin repetirlo en cada pieza.
- **Dónde se ve:** en la página del odontograma, debajo del plan de tratamiento, porque en papel está en esa hoja. Muestra cuándo se actualizó y quién. En la línea de tiempo (0021), cada versión cuenta como un día con registros, y un día anterior muestra la versión que estaba vigente ese día, solo para mirar.
- **En Postgres:** solo se agregan versiones (sin `update` ni `delete`). El autor y la profesional se completan desde la sesión, y los textos vacíos se guardan como `null`.

## Consecuencias

- Las preguntas son fijas en el código. Si ella necesita otras, se escribe una decisión nueva (por ejemplo, para hacerlas editables como el catálogo).
- Lo que abarca varias piezas tiene un lugar propio. No se dibuja en el gráfico.
- Los índices (CPO-D y ceo-d) no cambian.

# 0022: Editar el catálogo del odontograma

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** la [0020](0020-odontograma.md), que dejó para un cambio aparte editar el catálogo desde Ajustes.

## Contexto

El odontograma empezó con un catálogo inicial armado con las normas generales (0020), porque la dentista todavía no confirmó sus abreviaturas (`preguntas-pendientes.md`). Cuando las confirme, tiene que poder cambiarlas ella, sin tocar el código: `CLAUDE.md` pide un catálogo editable.

El problema es que los registros ya cargados dependen del código. Una caries cargada con grado y caras deja de tener sentido si después su código pasa a "sin caras", y un hallazgo tratado (0021) deja de serlo si su código pasa a "realizado".

## Decisión

- **Dónde:** en Ajustes, una sección "Códigos del odontograma", con los hallazgos y lo realizado por separado y cómo se dibuja cada uno. Lo ven todas; lo cambia solo la administradora, como las profesionales (0014). Los permisos ya estaban en RLS desde la 0020.
- **Lo que se puede cambiar siempre:** la abreviatura, el nombre, el dibujo y el índice en que cuenta. Se aplica a todo el odontograma, también a lo ya cargado: es lo que se busca al corregir una abreviatura. El CPO-D y el ceo-d se calculan al mostrarlos, así que también cambian.
- **Lo que queda fijo una vez usado:** si es hallazgo o realizado, si va por caras y si lleva grado. Los registros se cargaron con esas reglas (0020 y 0021). Postgres lo controla (`OD006`). Para cambiarlo, se da de baja el código y se crea otro.
- **Dar de baja**, en vez de borrar: el código deja de aparecer para agregar registros, pero los que ya lo usan se siguen viendo igual. Postgres rechaza un registro nuevo con un código dado de baja (`OD007`). Se puede **volver a usar**.
- La abreviatura no se repite entre los códigos en uso, sin importar mayúsculas (ya estaba en la 0020).
- Un código nuevo va al final de su grupo. Por ahora no se reordenan.
- Mientras se edita, se ve **cómo queda dibujado** en una pieza de ejemplo, con la misma vista del gráfico.

## Consecuencias

- Cuando ella confirme sus abreviaturas, las cambia desde la app: no hace falta una migración.
- Un código mal configurado que ya se usó no se arregla editándolo: se da de baja y se crea uno nuevo. Lo cargado con el anterior queda como estaba.
- Los códigos dados de baja no se borran nunca: los registros viejos siempre tienen con qué mostrarse.

# 0026: Presupuestos y libro de pagos

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Empieza:** el MVP 3 de [`alcance.md`](../alcance.md). Aplica las reglas de dinero de la [0003](0003-preparado-para-offline.md).

## Contexto

En el reverso de su historia en papel lleva una **planilla de cuotas** (`descubrimiento.md`):

- Al principio le explica al paciente el costo total y lo anota.
- Cada fila tiene la fecha, la cuota abonada, el saldo anterior, el saldo actual y la firma del paciente.
- Por ejemplo, una ortodoncia: cuota inicial de 1000 Bs, y los 5500 Bs restantes en cuotas de 400 Bs. Si el tratamiento se alarga, se siguen pagando cuotas hasta cubrir el saldo.

Las formas de pago son efectivo, QR o transferencia.

La 0003 ya fijó que los pagos solo se agregan, que el saldo se calcula, que los montos son enteros en centavos con su moneda y que el número de recibo lo asigna el servidor.

## Decisión

### Presupuesto
- Un paciente puede tener varios **presupuestos** a lo largo del tiempo, por ejemplo una ortodoncia y después una endodoncia. Cada uno tiene una descripción, el **total**, la **cuota inicial** y la **cuota sugerida** (opcionales), y la fecha.
- Se llama "presupuesto" para no confundirlo con el **plan de tratamiento** del odontograma (0021), que es la lista de hallazgos pendientes.
- El total y la cuota inicial no se editan, porque los pagos ya se calcularon sobre ellos. Si el precio cambia, se registra un **ajuste**. La descripción y la cuota sugerida sí se pueden cambiar.
- Un presupuesto sin movimientos se puede anular (borrado suave). Con movimientos, no.

### Movimientos (solo se agregan)
- **Pago:** monto positivo y forma de pago (efectivo, QR o transferencia). Lleva un **número de recibo** correlativo por organización, que asigna Postgres.
- **Ajuste:** monto positivo (sube el saldo, por ejemplo un tratamiento que se agregó) o negativo (lo baja: un descuento o un pago mal cargado), con un motivo obligatorio. Así se corrige un error sin borrar nada (0003).
- **Saldo** = total + ajustes − pagos. Se calcula siempre; no se guarda.
- Postgres impide que un pago supere el saldo (`PG001`) y que un ajuste lo deje negativo (`PG002`). También impide mover un presupuesto anulado (`PG003`), cambiar el total o la cuota inicial (`PG004`) y usar fechas futuras (`PG005`). Bloquea la fila del presupuesto mientras calcula, para que dos pagos a la vez no se pasen del saldo.
- Moneda: por ahora solo `BOB`. Se muestra como "Bs 1.000" o "Bs 1.000,50".

### Dónde se ve
- En la ficha del paciente, una sección **Pagos**. Cada presupuesto muestra el total, el saldo y la **planilla como la de papel**: fecha, abonado, saldo anterior, saldo actual y número de recibo.
- **"Registrar pago"** propone el monto: la cuota inicial en el primer pago y la cuota sugerida después, sin pasar del saldo.

### Lo que queda para después
- La foto del comprobante va con los archivos (Supabase Storage), en un cambio aparte.
- El recibo en PDF y la firma esperan la pregunta pendiente sobre la firma (`preguntas-pendientes.md`).

## Consecuencias
- Nada se borra ni se edita: la planilla siempre cuadra con los movimientos.
- Un error de carga queda a la vista como un ajuste, igual que tacharlo en papel.
- Los números de recibo pueden tener huecos (por ejemplo, si falla un insert después de asignarlo). Lo que importa es que no se repitan.

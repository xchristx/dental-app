# 0029: La imagen de cada Rx y el comprobante de cada pago

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Completa:** la [0027](0027-archivos-de-pacientes.md), que dejó para un cambio aparte ligar un archivo a una Rx (0023) o a un pago (0026).

## Contexto

La columna Rx (0023) registra que se tomó una radiografía, pero no guarda la imagen. El MVP 3 pide además la foto del comprobante de cada pago (`alcance.md`). La tabla `archivos` ya tenía `rx_id` y `movimiento_id`, con la regla de que el comprobante va con un pago y lo ligado a una Rx es una radiografía.

## Decisión

- **La imagen de una Rx se adjunta en el panel de la pieza**, debajo de cada Rx, con el botón "Adjuntar imagen". Elegir el archivo alcanza: se sube con la fecha de la Rx y sin nota, porque ya las tiene la Rx. Una Rx puede tener más de una imagen.
- **El comprobante se adjunta en el recibo del pago**, en la sección "Comprobante del pago". El recibo se abre al guardar el pago (0028), así que se adjunta en el mismo paso. Se sube con la fecha del pago. Se aceptan fotos y PDF.
  - **Solo los pagos por QR o transferencia** muestran esa sección: en efectivo no hay comprobante.
  - Un ajuste no lleva comprobante. Lo controla Postgres (`AR004`).
- **No se liga a algo anulado.** Si la Rx o el pago están anulados, Postgres lo rechaza (`AR005`).
- **Dónde se ve:**
  - Las imágenes de las Rx también aparecen en "Radiografías y fotos" de la ficha, con su pieza ("Radiografía de la pieza 46 del 15/11/2026").
  - Los comprobantes se ven solo en el recibo de su pago, para no mezclarlos con las radiografías.
- Cada miniatura abre la imagen en tamaño original. Lo adjuntado por error se anula ahí mismo, como en la 0027.
- **En la demo** no se adjunta nada (0027). En lugar del botón, se ve "En la demo no se adjuntan imágenes" (o comprobantes).

## Consecuencias

- Con esto, el MVP 3 queda completo.
- El comprobante no aparece en el PDF del recibo. El recibo es lo que ella le manda al paciente, y el comprobante ya lo tiene el paciente.

# 0028: Recibo por WhatsApp, sin firma

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Reemplaza:** en el MVP 3 de [`alcance.md`](../alcance.md), "Firma del paciente en pantalla". Completa la [0026](0026-presupuestos-y-libro-de-pagos.md).

## Contexto

En su planilla de papel, el paciente firma cada pago. Ella confirmó que **alcanza con mandarle el recibo por WhatsApp**, sin firma (`preguntas-pendientes.md`). Cada pago ya tiene un número de recibo correlativo, asignado por Postgres (0026).

WhatsApp no deja adjuntar archivos desde un enlace `wa.me`: solo texto. Para mandar un archivo desde una página web está el menú de compartir del sistema (Web Share API). Funciona en los celulares, pero no en todas las computadoras.

## Decisión

- **Sin firma.** Del MVP 3 se quita la firma en pantalla.
- **El recibo es un PDF que se genera en el navegador** al pedirlo, a partir del pago, que no cambia nunca (los pagos solo se agregan). No se guarda en Storage: siempre se puede volver a generar igual.
- **Qué dice:** el nombre del consultorio, "Recibo N.º 0006", la fecha, "Recibí de" el paciente, el monto en números y en letras ("Son: cuatrocientos 00/100 bolivianos"), el concepto (el presupuesto), la forma de pago, el saldo anterior y el saldo actual, y quién lo atendió. Abajo aclara que **no es una factura**: la facturación del SIN está fuera del alcance.
- **Cómo se manda:**
  - Si el dispositivo puede compartir archivos (el celular), **"Enviar por WhatsApp"** abre el menú de compartir con el PDF y un texto corto.
  - Si no (muchas computadoras), descarga el PDF y abre WhatsApp con el texto del recibo ya escrito, para el número del paciente. Ella adjunta el PDF descargado.
  - Siempre está **"Descargar PDF"**.
- **Cuándo:** al guardar un pago, se abre su recibo listo para mandar. También desde la planilla, en cualquier momento.
- La librería de PDF (`pdf-lib`) se carga **recién al generar el primero**, para no sumar peso al resto de la app.
- Los textos (el monto en letras y el mensaje) están en `@dental/core`, para la app Android.

## Consecuencias

- El MVP 3 queda completo con esto y con ligar los archivos a la Rx y al comprobante del pago.
- Como no hay firma, el respaldo del pago es el recibo enviado más la planilla, en la que nada se borra.
- En la computadora son dos pasos (descargar y adjuntar), porque WhatsApp no deja otra cosa. En el celular es uno.

# 0027: Archivos de pacientes (radiografías y fotos)

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Sigue:** el MVP 3 de [`alcance.md`](../alcance.md), después de la [0026](0026-presupuestos-y-libro-de-pagos.md).

## Contexto

Tiene las radiografías en papel, abrochadas a la historia. Además, se las mandan por WhatsApp, y esas están desordenadas (`descubrimiento.md`). El MVP 3 pide guardar radiografías y fotos por paciente y la foto del comprobante de cada pago. La columna Rx (0023) ya registra qué radiografías se tomaron, esperando la imagen.

El plan gratuito de Supabase da 1 GB de Storage, y una foto de celular pesa de 3 a 5 MB.

La demo es pública y se reinicia cada día. Si dejara subir archivos, cualquiera podría usarla para alojar imágenes ajenas, o subir fotos reales de pacientes.

## Decisión

- **Supabase Storage**, en un bucket privado `archivos`. Cada archivo se guarda en `organización/paciente/id`. Se ve con **URLs firmadas** que vencen en una hora; nunca hay URLs públicas.
- **Una tabla `archivos`** con el tipo (radiografía, foto o comprobante), la fecha, una nota, el tamaño y el formato. Puede ir ligada a una Rx (0023) o a un pago (0026). Un archivo no se edita: si se subió por error, se **anula** (borrado suave). El objeto queda en Storage, como respaldo.
- **Antes de subirla, la foto se achica en el navegador**: lado mayor de 2000 px, en JPEG. Una foto de celular queda en unos 300 a 600 KB. Los PDF se suben tal cual. Formatos: JPEG, PNG, WebP y PDF, hasta 10 MB.
- **Permisos en Postgres:**
  - En Storage, solo se lee y se sube dentro de la carpeta de la propia organización. No se puede modificar ni borrar.
  - En la tabla, solo se puede cambiar `deleted_at` (permisos por columna).
  - Un trigger controla que la Rx o el pago sean del mismo paciente (`AR002`) y que la fecha no sea futura (`AR003`).
- **La demo no sube archivos:** la organización tiene `permite_archivos`, y el seed de la demo lo deja en `false`. Lo controlan la política de Storage y el trigger (`AR001`). La interfaz lo explica en vez de mostrar el botón.
- **Dónde se ve:** en la ficha del paciente, la sección **Radiografías y fotos**, con miniaturas por fecha, para subir, ver en grande y anular. Ligar un archivo a una Rx o a un pago se hace en un cambio aparte.

## Consecuencias

- Las radiografías de WhatsApp quedan ordenadas por paciente y fecha.
- Si falla el registro después de subir el archivo, queda un objeto huérfano en Storage. Es raro y no se ve. Se puede limpiar después, cruzando Storage con la tabla.
- En la demo, la sección se ve, pero sin subir nada. Las pruebas locales activan `permite_archivos`.

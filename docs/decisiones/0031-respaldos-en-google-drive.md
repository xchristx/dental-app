# 0031: Respaldos cifrados en Google Drive

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Detalla:** los respaldos propios de la [0011](0011-produccion-en-plan-gratis.md), que dejó para una decisión aparte dónde corren y dónde se guardan.

## Contexto

La 0011 pide, antes del primer paciente real:

- un respaldo diario;
- cifrado con una clave pública antes de salir del servidor que lo genera;
- guardado fuera de Supabase y fuera del repositorio;
- los últimos 30 días;
- una prueba de restauración por mes.

Desde el MVP 3 hay además archivos en Storage (radiografías, fotos y comprobantes, 0027 y 0029), y `pg_dump` no los incluye.

El repositorio es público, y los logs y artifacts de GitHub Actions también.

Las cuentas de servicio de Google ya no tienen espacio propio en Drive: solo pueden subir a unidades compartidas de Workspace. Con una cuenta personal de Gmail hay que usar OAuth con un usuario.

## Decisión

- **Dónde corre:** el workflow programado "Respaldo de producción", a las 03:00 de La Paz. "Publicar en producción" también lo corre antes de migrar (0030).
- **Qué respalda:**
  - **La base**, con `supabase db dump`: los datos (`--data-only`, sin `storage.buckets`, que lo crea una migración), el esquema y la última migración aplicada.
  - **Los archivos nuevos de Storage**, leídos por su API S3. Como no se modifican ni se borran (0027), alcanza con subir los que todavía no están respaldados.
- **Cifrado:** con [age](https://age-encryption.org), para dos destinatarios: una clave del autor y otra de la dentista.
  - El runner solo tiene las claves públicas, guardadas en la variable `RESPALDO_CLAVES_PUBLICAS`.
  - Las privadas las guarda cada uno, fuera de GitHub y de Drive. Cualquiera de las dos descifra.
- **Dónde se guarda:** en Google Drive, en la carpeta `sifel-respaldos`, con [rclone](https://rclone.org).
  - Usa la cuenta de Google de Sifel (0030), con el permiso `drive.file`: rclone solo ve lo que él mismo subió.
  - La base queda en `base/`, un archivo por día, y se borran los de más de 30 días.
  - Los archivos quedan en `archivos/`, con la misma ruta que en Storage y `.age` al final. No se borran.
- **Nada sin cifrar sale del runner.** Ningún paso imprime datos, y no se suben artifacts.
- **Que no se pause:** el mismo workflow consulta la salud de Auth del proyecto todos los días (0011).
- **Prueba de restauración**, una vez al mes:
  - se corre `scripts/probar-respaldo.sh` con el respaldo del día y una clave privada;
  - el script descifra, deja la base local con las migraciones y carga los datos;
  - se revisa en la app local y después se corre `pnpm db:reset`.

## Consecuencias

- No cuesta nada: Drive da 15 GB, y la cuenta de Sifel no tiene nada más. La base comprimida pesa poco. Lo que más crece son los archivos, unos 300 a 600 KB por foto (0027).
- Las claves de S3 de Storage pasan por encima de RLS, así que son un secreto tan delicado como `PROD_DB_URL`. Las dos viven solo en el environment `produccion` de GitHub.
- Si el respaldo falla, GitHub le manda un correo a quien programó el workflow.
- **Probado el 2026-11-22 en local:**
  - un respaldo de la base con el seed, cifrado para dos claves, se restauró con la segunda clave, y las cuentas de cada tabla coinciden;
  - el paso de archivos solo sube lo nuevo, y cada archivo se descifra bien.

  El envío a Drive se prueba con la primera ejecución en GitHub.
- Si se agota el espacio de Drive, o el respaldo da más trabajo del que ahorra, se revisa esta decisión (0011).

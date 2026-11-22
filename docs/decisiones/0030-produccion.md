# 0030: Producción: proyecto, sitio, cuentas y cómo se publica

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Reemplaza:**
  - De la [0016](0016-region-de-supabase.md), que antes de crear producción se mide la latencia desde la conexión de la dentista. Ahora se mide después.
  - De la [0007](0007-autenticacion.md), que el cliente OAuth de Google se configura en los dos proyectos. Ahora va solo en producción.
  - De la [0016](0016-region-de-supabase.md), que producción y la demo ocupan el cupo de proyectos gratis del autor. Pasan a una cuenta de Supabase aparte, de Sifel.
  - De la [0015](0015-demo-se-reinicia-cada-dia.md), que la demo está en `sifel.netlify.app`. Pasa a `sifel-demo.netlify.app`, y `sifel.netlify.app` queda para producción.
- **Sigue:** la [0011](0011-produccion-en-plan-gratis.md). Los respaldos están en la [0031](0031-respaldos-en-google-drive.md).

## Contexto

Los MVP 1 a 3 están completos y la dentista va a empezar a usar la app con sus pacientes. Hasta ahora solo existe la demo: `sifel.netlify.app` con el proyecto `dental-app-demo-sa`. Se reinicia cada día con datos inventados (0015). Producción no se puede reiniciar nunca, ni recibir el seed.

El cupo gratis de Supabase permite dos proyectos activos (0016). Hoy solo está activa la demo.

## Decisión

### Una cuenta solo para Sifel

- **Una cuenta de Google dedicada**, con verificación en dos pasos. Es dueña de:
  - la cuenta de Supabase;
  - el cliente OAuth en Google Cloud;
  - la carpeta de respaldos en Drive (0031).

  Para entrar a la app, la dentista y el autor usan sus propias cuentas de Google: esta solo administra.
- **Una cuenta de Supabase aparte,** con el correo de Sifel y una organización `Sifel` que tiene los dos proyectos, la demo y producción.
  - El cupo de 2 proyectos gratis activos es por persona (0016). Así no choca con los otros proyectos del autor.
  - La demo se **transfiere** desde la cuenta del autor. Un proyecto transferido conserva su URL y sus claves, así que Netlify, `DEMO_DB_URL` y el reinicio diario no cambian.
  - Después, el autor sale de la organización o queda como Developer. Como Owner o Admin, los proyectos contarían en su cupo personal.

### Dónde

- **Supabase:** un proyecto nuevo, `sifel-produccion`, en sa-east-1 (São Paulo). Se crea sin medir antes desde la conexión de la dentista.
  - Esa medición se hace después.
  - Si otra región sale más de 20 ms mejor, se pasa a esa región con un respaldo y una restauración (0031), y se escribe una decisión nueva.
- **Web:** producción va en **`sifel.netlify.app`**, la dirección corta, que es la que va a usar la dentista. La demo pasa a **`sifel-demo.netlify.app`**.
  - El sitio actual de Netlify se renombra a `sifel-demo`. Conserva su configuración de demo y sigue publicando `main`.
  - Se crea un sitio nuevo llamado `sifel`, del mismo repositorio, que publica la rama `produccion`.
  - Los nombres de Netlify son únicos entre todos sus usuarios. Por eso, apenas se libera `sifel`, se reserva con un sitio provisorio hasta que producción esté lista.

### Cómo se publica

Producción no se publica sola con cada merge. Se usa el workflow manual **"Publicar en producción"**, que hace tres pasos en orden:

1. Respalda la base y los archivos (0031).
2. Aplica las migraciones nuevas con `supabase db push`, sin seed.
3. Mueve la rama `produccion` al commit de `main`. Solo puede avanzar (fast-forward).

Así, la web nueva sale recién cuando la base ya tiene el esquema que necesita. Si una migración falla, la web de producción sigue siendo la anterior.

Los secretos de producción están en el environment `produccion` de GitHub. Solo los ven los jobs que lo declaran.

### Cuentas y entrada

- **Dos cuentas, las dos `admin`:**
  - la dentista, ligada a su profesional;
  - el autor, sin profesional, para dar soporte. El autor ve los datos de los pacientes, y ella tiene que saberlo.
- **Se entra con Google.**
  - El registro público está apagado en el panel: "Allow new users to sign up".
  - Las cuentas se crean a mano en el panel, con el correo confirmado.
  - Al entrar con Google por primera vez, Supabase liga la identidad de Google a la cuenta que tiene el mismo correo verificado.
- **Correo y contraseña quedan como respaldo, pero limitados.** Sin un SMTP propio, Supabase solo manda correos a los miembros del equipo del proyecto. A la dentista no le llegarían el aviso de recuperar contraseña ni las invitaciones. Si hace falta una contraseña, la pone el autor desde el panel.
- **Google va solo en producción.** La demo no tiene invitaciones, así que con Google solo se vería "Esa cuenta todavía no tiene acceso". El botón de la demo sigue apagado (`VITE_GOOGLE_HABILITADO=false`).

### Alta inicial

- La organización, la profesional y las dos membresías se crean una sola vez con la plantilla `supabase/produccion/alta.sql`, en el SQL Editor del proyecto.
  - Los nombres y correos se completan ahí y no se guardan en el repositorio, que es público.
  - La plantilla también crea los tipos de cita, que no tienen pantalla en Ajustes.
- Lugares, horarios y las demás profesionales se cargan desde Ajustes.
- El catálogo del odontograma lo crea un trigger al crear la organización (0020).
- La organización de producción permite archivos (`permite_archivos` en `true` por defecto, 0027), porque sus archivos se respaldan (0031).

## Consecuencias

- Los enlaces viejos a `sifel.netlify.app` (portafolio, CV, mensajes) llevan a la entrada de producción, no a la demo. Hay que cambiarlos por `sifel-demo.netlify.app`.

- Publicar en producción es un paso consciente, con respaldo previo. Un merge a `main` solo cambia la demo.
- Si una migración necesita un cambio de datos o algo que no puede salir mal, se prueba antes restaurando un respaldo de producción en local (0031).
- Nunca se corre `db reset` ni el seed contra producción. Los workflows comprueban que el secreto no apunte al otro proyecto.
- La guía paso a paso está en [`docs/operacion/produccion.md`](../operacion/produccion.md).

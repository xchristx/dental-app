# 0007: Autenticación y membresías

- **Fecha:** 2026-11-19
- **Estado:** aceptada

## Contexto

Ella usa un celular Android y va a instalar la web como PWA. El link mágico por correo funciona mal en ese caso: el link se abre en el navegador y no en la app instalada, y la sesión queda en el lugar equivocado.

Más adelante entran las socias (decisión 0002), así que el usuario tiene que estar separado de la profesional.

## Decisión

- **Supabase Auth** con dos formas de entrar:
  - **Google**, la principal. En Android ya tiene su cuenta: es un toque.
  - **Correo y contraseña**, como respaldo.
- **No hay registro público.** El registro está desactivado y los usuarios se crean por invitación.
- Tabla `miembros`: usuario + organización + rol + profesional (opcional).
  - Roles iniciales: `admin` y `profesional`.
  - Una socia sin usuario existe como profesional sin miembro asociado.
- Las políticas RLS usan una función `org_ids_del_usuario()` que lee de `miembros`. Ninguna política compara directamente con un `organization_id` fijo.
- Sesión larga: no se le pide entrar de nuevo cada día.

## Consecuencias

- Hay que configurar el cliente OAuth de Google en los dos proyectos de Supabase (demo y producción).
- Dar acceso a una socia es crear una invitación y una fila en `miembros`. No hace falta cambiar el modelo.

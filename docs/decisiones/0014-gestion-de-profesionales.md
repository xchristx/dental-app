# 0014: Gestión de profesionales y permisos por rol

- **Fecha:** 2026-11-19
- **Estado:** aceptada
- **Completa:** la [0002](0002-lugares-y-sillones.md) (las socias existen como profesionales aunque no usen la app) y la [0007](0007-autenticacion.md) (roles `admin` y `profesional`).

## Contexto
Las profesionales solo se podían crear o cambiar con SQL. La dentista no podía agregar a una socia nueva, corregir un nombre ni sacar a alguien que dejó de trabajar con ella. Las socias tienen que estar cargadas para que la agenda avise cuando ocupan el sillón de su consultorio (0002).

La columna `especialidad` existía pero no se mostraba en ninguna parte.

Además, los permisos dejaban que cualquier miembro de la organización editara todo. Cuando las socias tengan usuario, eso deja que una socia cambie los datos o los horarios de otra.

## Decisión

### Sección "Profesionales" en Ajustes
- Lista con nombre y especialidad. La profesional de quien entró dice "Tú".
- **Agregar y editar** nombre y especialidad. La especialidad es texto libre y opcional ("Ortodoncia", "Implantología").
- **Dar de baja** es un borrado suave (0003). Sus citas pasadas quedan en el historial con su nombre. Deja de aparecer al agendar y en los horarios.
- La especialidad se muestra al elegir la profesional al agendar y en el detalle de la cita: "Dra. Rocío Paz · Ortodoncia".

### Cuándo no se puede dar de baja
Lo impide un trigger de Postgres, para que valga también fuera de la web:
- **Si tiene usuario** (una fila activa en `miembros`): primero hay que quitarle el acceso. Eso incluye a la propia admin.
- **Si tiene citas pendientes** (agendadas o confirmadas que todavía no terminaron): primero se reagendan o se cancelan. La app dice cuántas tiene.

### Permisos por rol (RLS)
| | Admin | Profesional (socia con usuario) |
|---|---|---|
| Ver profesionales y horarios | Todas | Todas |
| Agregar profesionales | Sí | No |
| Editar nombre, especialidad y margen de traslado | De cualquiera | Solo los suyos |
| Dar de baja | Sí | No, ni a sí misma |
| Cargar y cerrar horarios | De cualquiera | Solo los suyos |

Las políticas usan dos funciones nuevas, `es_admin_de(org)` y `profesional_del_usuario(org)`, con `security definer` como `org_ids_del_usuario`. Lugares, pacientes y citas siguen abiertos a todos los miembros: una socia que atiende en tu consultorio necesita agendar ahí.

## Consecuencias
- Mientras la dentista sea la única usuaria, nada cambia para ella: es admin.
- Dar acceso a una socia (0007) ya no le permite cambiar lo de las demás.
- Una profesional dada de baja sigue apareciendo en las citas viejas, porque esas consultas no filtran por `deleted_at` de la profesional.
- Volver a dar de alta a una profesional se hace por ahora con SQL. Si hace falta seguido, se agrega a la interfaz.

-- Alta de producción (decisión 0030). Se corre UNA sola vez, en el SQL Editor
-- del proyecto sifel-produccion, después de:
--   1. aplicar las migraciones (workflow "Publicar en producción"), y
--   2. crear las dos cuentas en Authentication → Users → Add user → Create new
--      user, con "Auto Confirm User". La contraseña puede ser larga y al azar:
--      se entra con Google, que se liga solo a la cuenta del mismo correo.
--
-- Completa los cuatro datos acá, en el editor. NO los guardes en el
-- repositorio: es público.
--
-- Lugares, horarios y el resto de profesionales se cargan después desde
-- Ajustes. El catálogo del odontograma lo crea un trigger al crear la
-- organización (0020).

do $$
declare
  v_consultorio    text := '';  -- Como sale en los recibos. Ej.: Consultorio Dental ...
  v_profesional    text := '';  -- La dentista, como sale en la agenda. Ej.: Dra. ...
  v_correo_admin   text := '';  -- Su cuenta de Google.
  v_correo_soporte text := '';  -- La cuenta del autor (admin, para soporte).

  v_org uuid := gen_random_uuid();
  v_prof uuid := gen_random_uuid();
  v_usuario_admin uuid;
  v_usuario_soporte uuid;
begin
  if v_consultorio = '' or v_profesional = '' or v_correo_admin = '' or v_correo_soporte = '' then
    raise exception 'Completa los cuatro datos del principio.';
  end if;
  if exists (select 1 from public.organizaciones) then
    raise exception 'Ya hay una organización: el alta se hace una sola vez.';
  end if;

  select id into v_usuario_admin from auth.users where lower(email) = lower(trim(v_correo_admin));
  if v_usuario_admin is null then
    raise exception 'No existe la cuenta %. Créala primero en Authentication → Users.', v_correo_admin;
  end if;
  select id into v_usuario_soporte from auth.users where lower(email) = lower(trim(v_correo_soporte));
  if v_usuario_soporte is null then
    raise exception 'No existe la cuenta %. Créala primero en Authentication → Users.', v_correo_soporte;
  end if;

  insert into public.organizaciones (id, nombre) values (v_org, trim(v_consultorio));
  insert into public.profesionales (id, organization_id, nombre) values (v_prof, v_org, trim(v_profesional));
  insert into public.miembros (organization_id, user_id, rol, profesional_id) values
    (v_org, v_usuario_admin, 'admin', v_prof),
    (v_org, v_usuario_soporte, 'admin', null);

  -- Los tipos de cita no tienen pantalla en Ajustes todavía.
  insert into public.tipos_cita (organization_id, nombre, duracion_min) values
    (v_org, 'Control', 60),
    (v_org, 'Retiro de puntos', 15),
    (v_org, 'Cirugía', 90),
    (v_org, 'Endodoncia', 60),
    (v_org, 'Control de ortodoncia', 30);

  raise notice 'Listo: organización %, con % códigos en el catálogo del odontograma.',
    v_org, (select count(*) from public.odontograma_codigos where organization_id = v_org);
end;
$$;

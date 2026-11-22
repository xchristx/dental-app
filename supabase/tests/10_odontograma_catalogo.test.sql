-- Editar el catálogo del odontograma (decisión 0022).
begin;
create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'rocio@ejemplo.test', 'authenticated', 'authenticated');
insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A');
insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Rocío');
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'profesional',
   'b0000000-0000-4000-8000-000000000002');
insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A');

create temporary view codigo as
  select abreviatura, id from public.odontograma_codigos
  where organization_id = 'a0000000-0000-4000-8000-000000000001';

-- Una caries ya cargada: el código C queda "usado".
insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, grado, fecha) values
  ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
   (select id from codigo where abreviatura = 'C'), 36, '{O}', 2, current_date - 10);

grant select on codigo to authenticated;
set local role authenticated;

-- Una socia no cambia el catálogo (RLS: la actualización no afecta filas).
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
update public.odontograma_codigos set nombre = 'Otra cosa' where id = (select id from codigo where abreviatura = 'C');
select is(
  (select nombre from public.odontograma_codigos where id = (select id from codigo where abreviatura = 'C')),
  'Caries',
  'una socia no edita el catálogo'
);

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select results_eq(
  $$select * from public.odontograma_codigos_usados()$$,
  $$select id from codigo where abreviatura = 'C'$$,
  'lista los códigos que ya tienen registros'
);

select lives_ok(
  $$update public.odontograma_codigos set abreviatura = ' Car ', nombre = 'Caries dental', simbolo = 'superficie', indice = 'cariado'
    where id = (select id from codigo where abreviatura = 'C')$$,
  'la admin cambia la abreviatura y el nombre de un código usado'
);
select is(
  (select abreviatura from codigo where abreviatura = 'Car'), 'Car',
  'sin espacios de más'
);

select throws_ok(
  $$update public.odontograma_codigos set usa_grado = false where id = (select id from codigo where abreviatura = 'Car')$$,
  'OD006', null,
  'un código usado no deja de llevar grado'
);
select throws_ok(
  $$update public.odontograma_codigos set tipo = 'realizado' where id = (select id from codigo where abreviatura = 'Car')$$,
  'OD006', null,
  'un código usado no pasa de hallazgo a realizado'
);
select lives_ok(
  $$update public.odontograma_codigos set por_caras = true, simbolo = 'superficie' where id = (select id from codigo where abreviatura = 'Fx')$$,
  'un código sin usar cambia como sea'
);

select throws_ok(
  $$insert into public.odontograma_codigos (organization_id, abreviatura, nombre, tipo, simbolo)
    values ('a0000000-0000-4000-8000-000000000001', 'car', 'Otra caries', 'hallazgo', 'texto')$$,
  '23505', null,
  'la abreviatura no se repite, sin importar mayúsculas'
);

-- Dar de baja: no se usa para registros nuevos, pero lo cargado sigue.
update public.odontograma_codigos set deleted_at = now() where id = (select id from codigo where abreviatura = 'Car');
select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 46, '{O}',
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Car')),
  'OD007', null,
  'un código dado de baja no se usa para agregar'
);
select lives_ok(
  $$update public.odontograma_registros set deleted_at = now() where pieza = 36$$,
  'lo cargado con un código dado de baja se puede anular'
);

select lives_ok(
  $$update public.odontograma_codigos set deleted_at = null where id = (select id from codigo where abreviatura = 'Car')$$,
  'un código dado de baja vuelve a usarse'
);

select * from finish();
rollback;

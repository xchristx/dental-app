-- Permisos por fila (decisiones 0003 y 0007).
-- Cada usuario solo ve y edita los datos de su organización, y nadie borra filas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

-- Datos inventados, cargados como superusuario
insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'usuaria-a@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'usuaria-b@ejemplo.test', 'authenticated', 'authenticated');

insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A'),
  ('a0000000-0000-4000-8000-000000000002', 'Organización B');

insert into public.miembros (organization_id, user_id, rol) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin'),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'admin');

insert into public.lugares (id, organization_id, nombre, updated_at) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Lugar de A', '2000-01-01'),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Lugar de B', '2000-01-01');

-- Usuaria A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select results_eq(
  'select nombre from public.lugares',
  array['Lugar de A'],
  'Solo ve los lugares de su organización'
);

select results_eq(
  'select nombre from public.organizaciones',
  array['Organización A'],
  'Solo ve su organización'
);

select is(
  (select count(*) from public.miembros),
  1::bigint,
  'Solo ve los miembros de su organización'
);

select lives_ok(
  $$ insert into public.lugares (organization_id, nombre)
     values ('a0000000-0000-4000-8000-000000000001', 'Nuevo lugar de A') $$,
  'Puede crear datos en su organización'
);

select throws_ok(
  $$ insert into public.lugares (organization_id, nombre)
     values ('a0000000-0000-4000-8000-000000000002', 'Intruso') $$,
  '42501', null,
  'No puede crear datos en otra organización'
);

select throws_ok(
  $$ update public.lugares set organization_id = 'a0000000-0000-4000-8000-000000000002'
     where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'No puede mover sus datos a otra organización'
);

select throws_ok(
  $$ delete from public.lugares where id = 'c0000000-0000-4000-8000-000000000001' $$,
  '42501', null,
  'No puede borrar filas: se usa borrado suave'
);

-- Intenta editar un lugar de B: no lo ve, así que no cambia nada.
update public.lugares set nombre = 'Cambiado por A'
where id = 'c0000000-0000-4000-8000-000000000002';

update public.lugares set nombre = 'Lugar de A (editado)'
where id = 'c0000000-0000-4000-8000-000000000001';

-- Usuaria B
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select results_eq(
  'select nombre from public.lugares',
  array['Lugar de B'],
  'Los datos de B no cambiaron cuando A intentó editarlos'
);

-- Sin sesión
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*) from public.lugares),
  0::bigint,
  'Sin sesión no se ve ningún lugar'
);

select is(
  (select count(*) from public.organizaciones),
  0::bigint,
  'Sin sesión no se ve ninguna organización'
);

select throws_ok(
  'select * from public.org_ids_del_usuario()',
  '42501', null,
  'Sin sesión no se puede llamar a org_ids_del_usuario()'
);

-- updated_at
reset role;

select ok(
  (select updated_at > '2000-01-01' from public.lugares where id = 'c0000000-0000-4000-8000-000000000001'),
  'Editar una fila actualiza updated_at'
);

select * from finish();
rollback;

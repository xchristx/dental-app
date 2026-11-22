-- Examen bucal (decisión 0024).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'otra@ejemplo.test', 'authenticated', 'authenticated');
insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A'),
  ('a0000000-0000-4000-8000-000000000002', 'Organización B');
insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Otra');
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'admin',
   'b0000000-0000-4000-8000-000000000002');
insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$insert into public.examen_bucal (id, organization_id, paciente_id, tartaro, halitosis, oclusion, observaciones)
    values ('e1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', true, false, ' Mordida abierta ', '  ')$$,
  'se agrega una versión del examen'
);

select is(
  (select row(tartaro, halitosis, placa_bacteriana, oclusion, observaciones, autor_id, profesional_id)::text
   from public.examen_bucal where id = 'e1000000-0000-4000-8000-000000000001'),
  row(true, false, null::boolean, 'Mordida abierta', null::text,
      'f0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid)::text,
  'sin dato queda en null, los textos sin espacios y el autor desde la sesión'
);

select throws_ok(
  $$update public.examen_bucal set tartaro = false$$,
  '42501', null,
  'no se edita una versión: se agrega otra'
);

select throws_ok(
  $$delete from public.examen_bucal$$,
  '42501', null,
  'no se borra'
);

select throws_ok(
  $$insert into public.examen_bucal (organization_id, paciente_id)
    values ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001')$$,
  null, null,
  'no se agrega en otra organización'
);

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is(
  (select count(*) from public.examen_bucal)::int, 0,
  'otra organización no ve el examen'
);

select * from finish();
rollback;

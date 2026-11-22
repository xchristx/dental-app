-- Editar la nota de un registro del odontograma (decisión 0025).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

-- Una nota de Laura de hace dos días (cargada como superusuario).
insert into public.odontograma_registros (id, organization_id, paciente_id, pieza, nota, fecha, autor_id, created_at) values
  ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 14, 'Sensibilidad', current_date - 2,
   'f0000000-0000-4000-8000-000000000001', now() - interval '2 days');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- Una de hoy, de Laura.
insert into public.odontograma_registros (id, organization_id, paciente_id, pieza, nota, fecha) values
  ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 15, 'Sensibilidad al frio',
   (now() at time zone 'America/La_Paz')::date);

select lives_ok(
  $$update public.odontograma_registros set nota = 'Sensibilidad al frío' where id = 'c1000000-0000-4000-8000-000000000002'$$,
  'quien la cargó corrige la nota el mismo día'
);

select throws_ok(
  $$update public.odontograma_registros set nota = 'Otra cosa' where id = 'c1000000-0000-4000-8000-000000000001'$$,
  'OD009', null,
  'de otro día ya no se corrige'
);

select throws_ok(
  $$update public.odontograma_registros set nota = null where id = 'c1000000-0000-4000-8000-000000000002'$$,
  '23514', null,
  'una nota sola no queda vacía'
);

select lives_ok(
  $$update public.odontograma_registros set deleted_at = now() where id = 'c1000000-0000-4000-8000-000000000001'$$,
  'anular un registro de otro día sigue igual'
);

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok(
  $$update public.odontograma_registros set nota = 'Otra cosa' where id = 'c1000000-0000-4000-8000-000000000002'$$,
  'OD008', null,
  'otra persona no cambia la nota'
);

select is(
  (select nota from public.odontograma_registros where id = 'c1000000-0000-4000-8000-000000000002'),
  'Sensibilidad al frío',
  'la nota quedó corregida'
);

select * from finish();
rollback;

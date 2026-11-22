-- Derivaciones (decisión 0019). Las fechas son relativas a now().
begin;
create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000003', 'otra@ejemplo.test', 'authenticated', 'authenticated');

insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A'),
  ('a0000000-0000-4000-8000-000000000002', 'Organización B');

insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Rocío');

insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000003', 'admin', null);

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$insert into public.derivaciones (id, organization_id, paciente_id, sentido, profesional_id, contacto, motivo, fecha)
    values ('90000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', 'enviada', 'b0000000-0000-4000-8000-000000000002',
            'Sobra', '  Ortodoncia  ', (now() at time zone 'America/La_Paz')::date)$$,
  'se deriva a una socia'
);

select results_eq(
  $$select autor_id, contacto, motivo from public.derivaciones where id = '90000000-0000-4000-8000-000000000001'$$,
  $$values ('f0000000-0000-4000-8000-000000000001'::uuid, null::text, 'Ortodoncia'::text)$$,
  'el autor sale de la sesión; con profesional, el nombre de afuera se descarta'
);

select lives_ok(
  $$insert into public.derivaciones (organization_id, paciente_id, sentido, contacto, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
            'recibida', 'Dr. Pérez, endodoncista', (now() at time zone 'America/La_Paz')::date - 30)$$,
  'se anota una derivación recibida de alguien de afuera'
);

select throws_ok(
  $$insert into public.derivaciones (organization_id, paciente_id, sentido, contacto, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
            'recibida', '   ', (now() at time zone 'America/La_Paz')::date)$$,
  '23514', null,
  'hace falta una profesional o un nombre'
);

select throws_ok(
  $$insert into public.derivaciones (organization_id, paciente_id, sentido, contacto, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
            'enviada', 'Dr. Pérez', (now() at time zone 'America/La_Paz')::date + 1)$$,
  'DR001', null,
  'la fecha no puede ser futura'
);

select lives_ok(
  $$update public.derivaciones set motivo = 'Ortodoncia correctiva', deleted_at = now()
    where id = '90000000-0000-4000-8000-000000000001'$$,
  'se corrige y se borra con deleted_at'
);

select throws_ok(
  $$delete from public.derivaciones where id = '90000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'no se borra de verdad'
);

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);
select is((select count(*) from public.derivaciones), 0::bigint, 'otra organización no las ve');

select * from finish();
rollback;

-- Historia clínica (decisión 0018): anamnesis que solo se agrega, evolución
-- que se corrige solo el mismo día y por quien la escribió, y autor desde la
-- sesión. Las fechas son relativas a now().
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

-- Datos inventados, cargados como superusuario
insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'rocio@ejemplo.test', 'authenticated', 'authenticated'),
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
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'profesional',
   'b0000000-0000-4000-8000-000000000002'),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000003', 'admin', null);

insert into public.lugares (id, organization_id, nombre) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Consultorio');

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Paciente B');

-- Una cita del paciente B
insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, estado, inicio, fin) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000002', 'atendida',
   now() - interval '2 days', now() - interval '2 days' + interval '1 hour');

-- Evoluciones ya escritas: una de ayer de Laura y una de hoy de Rocío
insert into public.evoluciones (id, organization_id, paciente_id, fecha, texto, autor_id, created_at) values
  ('70000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', (now() at time zone 'America/La_Paz')::date - 1,
   'Profilaxis.', 'f0000000-0000-4000-8000-000000000001', now() - interval '1 day'),
  ('70000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', (now() at time zone 'America/La_Paz')::date,
   'Control de ortodoncia.', 'f0000000-0000-4000-8000-000000000002', now());

-- A partir de acá, como Laura desde la web
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- Anamnesis --------------------------------------------------------------

select lives_ok(
  $$insert into public.anamnesis (id, organization_id, paciente_id, alergias, medicamentos, autor_id)
    values ('80000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', '  Penicilina  ', '',
            'f0000000-0000-4000-8000-000000000002')$$,
  'se agrega una anamnesis'
);

select results_eq(
  $$select autor_id, profesional_id, alergias, medicamentos from public.anamnesis
    where id = '80000000-0000-4000-8000-000000000001'$$,
  $$values ('f0000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000001'::uuid,
            'Penicilina'::text, null::text)$$,
  'el autor sale de la sesión, aunque se mande otro, y los textos se recortan'
);

select throws_ok(
  $$insert into public.anamnesis (organization_id, paciente_id, alergias, sin_alergias)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Látex', true)$$,
  '23514', null,
  '"Sin alergias conocidas" no se marca con alergias escritas'
);

select lives_ok(
  $$insert into public.anamnesis (organization_id, paciente_id, alergias, sin_alergias)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002', '   ', true)$$,
  'un texto de alergias en blanco cuenta como vacío'
);

select throws_ok(
  $$update public.anamnesis set alergias = 'Ninguna' where id = '80000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'una anamnesis no se edita: se agrega otra versión'
);

select throws_ok(
  $$delete from public.anamnesis where id = '80000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'una anamnesis no se borra'
);

-- Evolución --------------------------------------------------------------

select lives_ok(
  $$insert into public.evoluciones (id, organization_id, paciente_id, cita_id, fecha, texto)
    values ('70000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
            (now() at time zone 'America/La_Paz')::date - 2, 'Obturación OM en 36.')$$,
  'se escribe una evolución ligada a una cita del paciente'
);

select is(
  (select profesional_id from public.evoluciones where id = '70000000-0000-4000-8000-000000000003'),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'la evolución queda firmada por la profesional de la sesión'
);

select lives_ok(
  $$update public.evoluciones set texto = 'Obturación OM en 36, resina A2.'
    where id = '70000000-0000-4000-8000-000000000003'$$,
  'quien la escribió la corrige el mismo día'
);

update public.evoluciones set paciente_id = 'd0000000-0000-4000-8000-000000000001'
where id = '70000000-0000-4000-8000-000000000003';

select is(
  (select paciente_id from public.evoluciones where id = '70000000-0000-4000-8000-000000000003'),
  'd0000000-0000-4000-8000-000000000002'::uuid,
  'al corregirla no se pasa a otro paciente'
);

select lives_ok(
  $$update public.evoluciones set deleted_at = now() where id = '70000000-0000-4000-8000-000000000003'$$,
  'quien la escribió la borra el mismo día'
);

select throws_ok(
  $$update public.evoluciones set texto = 'Profilaxis y flúor.' where id = '70000000-0000-4000-8000-000000000001'$$,
  'EV002', null,
  'una evolución de ayer no se corrige'
);

select throws_ok(
  $$update public.evoluciones set texto = 'Otro texto.' where id = '70000000-0000-4000-8000-000000000002'$$,
  'EV001', null,
  'una evolución de otra profesional no se corrige'
);

select throws_ok(
  $$insert into public.evoluciones (organization_id, paciente_id, fecha, texto)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
            (now() at time zone 'America/La_Paz')::date + 1, 'Mañana.')$$,
  'EV003', null,
  'la fecha no puede ser futura'
);

select throws_ok(
  $$insert into public.evoluciones (organization_id, paciente_id, cita_id, fecha, texto)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
            'e0000000-0000-4000-8000-000000000001', (now() at time zone 'America/La_Paz')::date, 'Cita ajena.')$$,
  'EV004', null,
  'la cita tiene que ser del mismo paciente'
);

select throws_ok(
  $$delete from public.evoluciones where id = '70000000-0000-4000-8000-000000000002'$$,
  '42501', null,
  'una evolución no se borra de verdad'
);

-- Otra organización no ve nada --------------------------------------------

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);

select is((select count(*) from public.anamnesis), 0::bigint, 'otra organización no ve las anamnesis');
select is((select count(*) from public.evoluciones), 0::bigint, 'otra organización no ve las evoluciones');

select * from finish();
rollback;

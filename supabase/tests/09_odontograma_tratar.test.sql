-- Tratar un hallazgo (decisión 0021).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated');
insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A');
insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura');
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001');
insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A');

create temporary view codigo as
  select abreviatura, id from public.odontograma_codigos
  where organization_id = 'a0000000-0000-4000-8000-000000000001';

-- Una caries en 36 y una obturación previa en 46
insert into public.odontograma_registros (id, organization_id, paciente_id, codigo_id, pieza, caras, fecha) values
  ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', (select id from codigo where abreviatura = 'C'), 36, '{O}', current_date - 10),
  ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', (select id from codigo where abreviatura = 'Obt'), 46, '{O}', current_date - 10);

grant select on codigo to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 36, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000001')$$,
    (select id from codigo where abreviatura = 'Rec')),
  'OD004', null,
  'un hallazgo no resuelve a otro'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 37, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000001')$$,
    (select id from codigo where abreviatura = 'Obt')),
  'OD005', null,
  'lo que resuelve tiene que ser de la misma pieza'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 46, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000002')$$,
    (select id from codigo where abreviatura = 'Obt')),
  'OD005', null,
  'solo se resuelve un hallazgo, no algo realizado'
);

select lives_ok(
  format($$insert into public.odontograma_registros (id, organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('c1000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', %L, 36, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000001')$$,
    (select id from codigo where abreviatura = 'Obt')),
  'una obturación trata la caries de la misma pieza'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 36, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000001')$$,
    (select id from codigo where abreviatura = 'Inc')),
  '23505', null,
  'un hallazgo se resuelve una sola vez'
);

select lives_ok(
  $$update public.odontograma_registros set deleted_at = now() where id = 'c1000000-0000-4000-8000-000000000003'$$,
  'se anula lo realizado'
);

select lives_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, caras, fecha, resuelve_id)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 36, '{O}',
            (now() at time zone 'America/La_Paz')::date, 'c1000000-0000-4000-8000-000000000001')$$,
    (select id from codigo where abreviatura = 'Inc')),
  'anulado lo realizado, el hallazgo se vuelve a tratar'
);

select * from finish();
rollback;

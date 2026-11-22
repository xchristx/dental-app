-- Odontograma (decisión 0020): catálogo inicial, piezas FDI, caras y grado.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

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

select is(
  (select count(*) from public.odontograma_codigos where organization_id = 'a0000000-0000-4000-8000-000000000001'),
  19::bigint,
  'una organización nueva empieza con el catálogo inicial'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

create temporary view codigo as
  select abreviatura, id from public.odontograma_codigos;

select lives_ok(
  format($$insert into public.odontograma_registros (id, organization_id, paciente_id, codigo_id, pieza, caras, grado, fecha)
    values ('c1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', %L, 36, array['V', 'O', 'M', 'O'], 2,
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'C')),
  'se registra una caries grado II en 36'
);

select results_eq(
  $$select caras, autor_id from public.odontograma_registros where id = 'c1000000-0000-4000-8000-000000000001'$$,
  $$values (array['O', 'M', 'V'], 'f0000000-0000-4000-8000-000000000001'::uuid)$$,
  'las caras quedan sin repetir y en orden, y el autor sale de la sesión'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 36,
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Obt')),
  'OD001', null,
  'una obturación pide al menos una cara'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, grado, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 16, 2,
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Cor')),
  'OD002', null,
  'una corona no lleva grado'
);

select lives_ok(
  format($$insert into public.odontograma_registros (id, organization_id, paciente_id, codigo_id, pieza, caras, fecha)
    values ('c1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', %L, 85, array['O'],
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Ext')),
  'una extracción indicada en una temporal'
);

select is(
  (select caras from public.odontograma_registros where id = 'c1000000-0000-4000-8000-000000000002'),
  null::text[],
  'un código que no va por caras las descarta'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 19,
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Ext')),
  '23514', null,
  'la pieza 19 no existe en FDI'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 56,
            (now() at time zone 'America/La_Paz')::date)$$,
    (select id from codigo where abreviatura = 'Ext')),
  '23514', null,
  'la temporal 56 no existe'
);

select throws_ok(
  format($$insert into public.odontograma_registros (organization_id, paciente_id, codigo_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', %L, 11,
            (now() at time zone 'America/La_Paz')::date + 1)$$,
    (select id from codigo where abreviatura = 'Ext')),
  'OD003', null,
  'la fecha no puede ser futura'
);

select lives_ok(
  $$update public.odontograma_registros set deleted_at = now()
    where id = 'c1000000-0000-4000-8000-000000000001'$$,
  'un registro se quita con deleted_at'
);

select lives_ok(
  $$update public.odontograma_codigos set nombre = 'Caries dental' where abreviatura = 'C'$$,
  'la admin edita el catálogo'
);

-- Rocío (profesional, no admin) no cambia el catálogo: el update no toca filas.
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
update public.odontograma_codigos set nombre = 'Otra cosa' where abreviatura = 'C';

select is(
  (select nombre from public.odontograma_codigos where abreviatura = 'C'),
  'Caries dental',
  'una profesional que no es admin no cambia el catálogo'
);

select * from finish();
rollback;

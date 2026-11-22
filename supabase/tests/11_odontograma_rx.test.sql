-- Radiografías en el odontograma (decisión 0023).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

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
  $$insert into public.odontograma_rx (id, organization_id, paciente_id, pieza, fecha, nota)
    values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', 36, (now() at time zone 'America/La_Paz')::date, ' periapical ')$$,
  'se registra la Rx de una pieza'
);

select is(
  (select row(autor_id, nota)::text from public.odontograma_rx where id = 'e0000000-0000-4000-8000-000000000001'),
  row('f0000000-0000-4000-8000-000000000001'::uuid, 'periapical')::text,
  'el autor sale de la sesión y la nota va sin espacios de más'
);

select throws_ok(
  $$insert into public.odontograma_rx (organization_id, paciente_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 36,
            (now() at time zone 'America/La_Paz')::date + 1)$$,
  'OD003', null,
  'la fecha no puede ser futura'
);

select throws_ok(
  $$insert into public.odontograma_rx (organization_id, paciente_id, pieza, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 19, current_date)$$,
  '23514', null,
  'la pieza tiene que existir'
);

select throws_ok(
  $$delete from public.odontograma_rx$$,
  '42501', null,
  'no se borra: se anula'
);

select lives_ok(
  $$update public.odontograma_rx set deleted_at = now() where id = 'e0000000-0000-4000-8000-000000000001'$$,
  'se anula una Rx cargada por error'
);

-- Otra organización no la ve.
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is(
  (select count(*) from public.odontograma_rx)::int, 0,
  'otra organización no ve las radiografías'
);

select * from finish();
rollback;

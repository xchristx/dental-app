-- Reagendar (decisiones 0005 y 0012).
-- Corre como una usuaria real (authenticated), para probar también los permisos.
begin;
create extension if not exists pgtap with schema extensions;

select plan(13);

-- Datos inventados, cargados como superusuario
insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'usuaria-a@ejemplo.test', 'authenticated', 'authenticated');

insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A'),
  ('a0000000-0000-4000-8000-000000000002', 'Organización B');

insert into public.miembros (organization_id, user_id, rol) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin');

insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Profesional A'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Profesional B');

insert into public.lugares (id, organization_id, nombre, controla_sillon) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Consultorio', true),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Lugar de B', true);

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Paciente B');

insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, estado, nota, inicio, fin) values
  -- La que se reagenda
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'agendada', null, '2099-11-24 10:00-04', '2099-11-24 11:00-04'),
  -- Otra cita del mismo día, para probar un choque
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'agendada', null, '2099-11-24 12:00-04', '2099-11-24 13:00-04'),
  -- Atendida
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'atendida', null, '2099-11-23 10:00-04', '2099-11-23 11:00-04'),
  -- Bloqueo
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   null, 'agendada', 'Trámite', '2099-11-25 10:00-04', '2099-11-25 11:00-04'),
  -- No asistió
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'no_asistio', null, '2099-11-20 10:00-04', '2099-11-20 11:00-04'),
  -- De otra organización
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002',
   'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002',
   'd0000000-0000-4000-8000-000000000002', 'agendada', null, '2099-11-24 10:00-04', '2099-11-24 11:00-04');

-- Usuaria A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- Media hora más tarde, en el mismo sillón: se superpone con la original, que se libera.
select is(
  public.reagendar_cita(
    'e0000000-0000-4000-8000-000000000001', 'cancelada', 'e1000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
    '2099-11-24 10:30-04', '2099-11-24 11:30-04', null, 'Pidió más tarde'),
  'e1000000-0000-4000-8000-000000000001'::uuid,
  'Reagenda a un horario que se superpone con la cita original'
);

select is(
  (select estado from public.citas where id = 'e0000000-0000-4000-8000-000000000001'),
  'cancelada',
  'La original queda cancelada'
);

select results_eq(
  $$ select paciente_id, reagendada_desde, estado from public.citas where id = 'e1000000-0000-4000-8000-000000000001' $$,
  $$ values ('d0000000-0000-4000-8000-000000000001'::uuid, 'e0000000-0000-4000-8000-000000000001'::uuid, 'agendada'::text) $$,
  'La nueva es del mismo paciente, apunta a la original y queda agendada'
);

select is(
  public.reagendar_cita(
    'e0000000-0000-4000-8000-000000000001', 'cancelada', 'e1000000-0000-4000-8000-000000000001',
    'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
    '2099-11-24 10:30-04', '2099-11-24 11:30-04', null, 'Pidió más tarde'),
  'e1000000-0000-4000-8000-000000000001'::uuid,
  'Repetir el mismo pedido no crea otra cita'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000001', 'cancelada', 'e1000000-0000-4000-8000-000000000002',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-26 10:00-04', '2099-11-26 11:00-04', null, null) $$,
  'RE002', null,
  'Una cita se reagenda una sola vez'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e1000000-0000-4000-8000-000000000001', 'cancelada', 'e1000000-0000-4000-8000-000000000003',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-24 12:30-04', '2099-11-24 13:30-04', null, null) $$,
  '23P01', null,
  'Si la nueva choca con otra cita, no se reagenda'
);

select is(
  (select estado from public.citas where id = 'e1000000-0000-4000-8000-000000000001'),
  'agendada',
  'Y la original sigue agendada: no queda a medias'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000003', 'cancelada', 'e1000000-0000-4000-8000-000000000004',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-27 10:00-04', '2099-11-27 11:00-04', null, null) $$,
  'RE001', null,
  'Una cita atendida no se reagenda'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000004', 'cancelada', 'e1000000-0000-4000-8000-000000000005',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-27 10:00-04', '2099-11-27 11:00-04', null, null) $$,
  'RE001', null,
  'Un bloqueo no se reagenda'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000005', 'atendida', 'e1000000-0000-4000-8000-000000000006',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-27 10:00-04', '2099-11-27 11:00-04', null, null) $$,
  '22023', null,
  'La original solo puede quedar cancelada o como no asistió'
);

select public.reagendar_cita(
  'e0000000-0000-4000-8000-000000000005', 'cancelada', 'e1000000-0000-4000-8000-000000000007',
  'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
  '2099-11-27 10:00-04', '2099-11-27 11:00-04', null, null);

select is(
  (select estado from public.citas where id = 'e0000000-0000-4000-8000-000000000005'),
  'no_asistio',
  'Si no asistió, queda como no asistió'
);

select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000006', 'cancelada', 'e1000000-0000-4000-8000-000000000008',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-28 10:00-04', '2099-11-28 11:00-04', null, null) $$,
  'P0002', null,
  'No puede reagendar citas de otra organización'
);

-- Sin sesión
reset role;
set local role anon;
select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000002', 'cancelada', 'e1000000-0000-4000-8000-000000000009',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       '2099-11-28 10:00-04', '2099-11-28 11:00-04', null, null) $$,
  '42501', null,
  'Sin sesión no se puede reagendar'
);

select * from finish();
rollback;

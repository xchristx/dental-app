-- Gestión de profesionales y permisos por rol (0014).
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

-- Datos inventados, cargados como superusuario.
-- Organización A: la admin (Profesional A) y una socia con usuario (Profesional B).
-- Profesional C es una socia sin usuario.
insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'admin@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'socia@ejemplo.test', 'authenticated', 'authenticated');

insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A');

insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Profesional A'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Profesional B'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Profesional C'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Profesional D');

insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin', 'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'profesional', 'b0000000-0000-4000-8000-000000000002');

insert into public.lugares (id, organization_id, nombre) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Consultorio');

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente de prueba');

-- C tiene una cita pendiente; D solo una cita que ya pasó.
insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', now() + interval '1 day', now() + interval '1 day 1 hour'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', now() - interval '2 days', now() - interval '2 days' + interval '1 hour');

-- ---------------------------------------------------------------------------
-- La socia con usuario (rol profesional)
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select throws_ok(
  $$ insert into public.profesionales (organization_id, nombre)
     values ('a0000000-0000-4000-8000-000000000001', 'Nueva') $$,
  '42501', null,
  'Una socia no puede agregar profesionales'
);

select lives_ok(
  $$ update public.profesionales set margen_traslado_min = 45
     where id = 'b0000000-0000-4000-8000-000000000002' $$,
  'Una socia puede editar sus propios datos'
);

update public.profesionales set nombre = 'Cambiado' where id = 'b0000000-0000-4000-8000-000000000003';
select is(
  (select nombre from public.profesionales where id = 'b0000000-0000-4000-8000-000000000003'),
  'Profesional C',
  'Una socia no puede editar a otra profesional'
);

select throws_ok(
  $$ update public.profesionales set deleted_at = now()
     where id = 'b0000000-0000-4000-8000-000000000002' $$,
  null, null,
  'Una socia no puede darse de baja a sí misma (lo impiden el permiso y tener usuario)'
);

select lives_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
             'c0000000-0000-4000-8000-000000000001', 1, '10:00', '13:00') $$,
  'Una socia puede cargar sus horarios'
);

select throws_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
             'c0000000-0000-4000-8000-000000000001', 1, '10:00', '13:00') $$,
  '42501', null,
  'Una socia no puede cargar horarios de otra profesional'
);

-- ---------------------------------------------------------------------------
-- La admin
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into public.profesionales (organization_id, nombre, especialidad)
     values ('a0000000-0000-4000-8000-000000000001', 'Dra. Nueva', 'Implantología') $$,
  'La admin puede agregar profesionales'
);

select lives_ok(
  $$ update public.profesionales set especialidad = 'Ortodoncia'
     where id = 'b0000000-0000-4000-8000-000000000003' $$,
  'La admin puede editar a cualquier profesional'
);

select lives_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
             'c0000000-0000-4000-8000-000000000001', 2, '15:00', '18:00') $$,
  'La admin puede cargar horarios de cualquier profesional'
);

select throws_ok(
  $$ update public.profesionales set deleted_at = now()
     where id = 'b0000000-0000-4000-8000-000000000002' $$,
  'PR001', null,
  'No se da de baja a una profesional que tiene usuario'
);

select throws_ok(
  $$ update public.profesionales set deleted_at = now()
     where id = 'b0000000-0000-4000-8000-000000000003' $$,
  'PR002', null,
  'No se da de baja a una profesional con citas pendientes'
);

update public.citas set estado = 'cancelada' where id = 'e0000000-0000-4000-8000-000000000001';
select lives_ok(
  $$ update public.profesionales set deleted_at = now()
     where id = 'b0000000-0000-4000-8000-000000000003' $$,
  'Con sus citas canceladas, sí se la da de baja'
);

select lives_ok(
  $$ update public.profesionales set deleted_at = now()
     where id = 'b0000000-0000-4000-8000-000000000004' $$,
  'Las citas que ya pasaron no impiden la baja'
);

select is(
  (select count(*) from public.citas where profesional_id = 'b0000000-0000-4000-8000-000000000004'),
  1::bigint,
  'Sus citas pasadas quedan como historial'
);

select * from finish();
rollback;

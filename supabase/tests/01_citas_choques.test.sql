-- Choques de agenda (decisiones 0002 y 0005).
-- Corre como superusuario: acá se prueban las restricciones, no los permisos.
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

-- Datos inventados
insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización de prueba'),
  ('a0000000-0000-4000-8000-000000000002', 'Otra organización');

insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Profesional A'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Profesional B'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Profesional de otra organización');

insert into public.lugares (id, organization_id, nombre, controla_sillon) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Consultorio', true),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Clínica', false);

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente de prueba');

-- Cita base: A en el consultorio de 10:00 a 11:00
insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', '2026-11-24 10:00-04', '2026-11-24 11:00-04');

-- Por profesional

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 10:30-04', '2026-11-24 11:30-04') $$,
  '23P01', null,
  'La misma profesional no puede tener dos citas superpuestas, aunque sea en otro lugar'
);

select lives_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 11:00-04', '2026-11-24 12:00-04') $$,
  'Una cita puede empezar justo cuando termina la anterior'
);

-- Por sillón

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
      'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 10:30-04', '2026-11-24 11:30-04') $$,
  '23P01', null,
  'Un consultorio de un solo sillón no admite dos citas a la vez, aunque sean de profesionales distintas'
);

select lives_ok(
  $$ insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002',
      'd0000000-0000-4000-8000-000000000001', '2026-11-24 11:30-04', '2026-11-24 12:30-04') $$,
  'En un lugar que no controla el sillón, dos profesionales pueden atender a la vez'
);

select throws_ok(
  $$ update public.lugares set controla_sillon = true
     where id = 'c0000000-0000-4000-8000-000000000002' $$,
  '23P01', null,
  'Un lugar con citas superpuestas no puede pasar a controlar el sillón'
);

update public.citas set lugar_controla_sillon = false
where id = 'e0000000-0000-4000-8000-000000000001';

select is(
  (select lugar_controla_sillon from public.citas where id = 'e0000000-0000-4000-8000-000000000001'),
  true,
  'La copia de controla_sillon en la cita no se puede cambiar a mano'
);

-- Estados que liberan el espacio

update public.citas set estado = 'cancelada'
where id = 'e0000000-0000-4000-8000-000000000001';

select lives_ok(
  $$ insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001', '2026-11-24 10:00-04', '2026-11-24 11:00-04') $$,
  'Una cita cancelada libera el espacio'
);

select throws_ok(
  $$ update public.citas set estado = 'agendada'
     where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '23P01', null,
  'Volver a agendar una cita cancelada también respeta los choques'
);

update public.citas set estado = 'no_asistio'
where id = 'e0000000-0000-4000-8000-000000000003';

select lives_ok(
  $$ insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
      'd0000000-0000-4000-8000-000000000001', '2026-11-24 10:30-04', '2026-11-24 11:00-04') $$,
  'Una cita marcada como no_asistio libera el espacio'
);

update public.citas set deleted_at = now()
where id = 'e0000000-0000-4000-8000-000000000004';

select lives_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 10:30-04', '2026-11-24 11:00-04') $$,
  'Una cita borrada (borrado suave) libera el espacio'
);

-- Bloqueos

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, nota, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002', 'Trámite',
      '2026-11-24 11:30-04', '2026-11-24 12:30-04') $$,
  '23P01', null,
  'Un bloqueo también ocupa la agenda'
);

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, nota, estado, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002', 'Trámite', 'atendida',
      '2026-11-24 15:00-04', '2026-11-24 16:00-04') $$,
  '23514', null,
  'Un bloqueo solo puede estar agendado o cancelado'
);

-- Datos válidos

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 15:00-04', '2026-11-24 15:00-04') $$,
  '23514', null,
  'Una cita tiene que terminar después de empezar'
);

select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, inicio, fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000003',
      'c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001',
      '2026-11-24 15:00-04', '2026-11-24 16:00-04') $$,
  '23503', null,
  'Una cita no puede usar una profesional de otra organización'
);

select throws_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000001', 2, '13:00', '10:00') $$,
  '23514', null,
  'Un horario tiene que terminar después de empezar'
);

select throws_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin) values
     ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
      'c0000000-0000-4000-8000-000000000001', 0, '10:00', '13:00') $$,
  '23514', null,
  'El día de la semana va de 1 (lunes) a 7 (domingo)'
);

select * from finish();
rollback;

-- Reglas de negocio en la base (decisión 0017): estados, reglas de tiempo
-- (0013), llegada, recordatorio, extensión, reagendar, pacientes y horarios.
-- Las fechas son relativas a now(): la prueba no depende del día en que corre.
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- Datos inventados, cargados como superusuario
insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'admin@ejemplo.test', 'authenticated', 'authenticated');

insert into public.organizaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A');

insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Profesional A');

insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001');

insert into public.lugares (id, organization_id, nombre, controla_sillon) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Clínica', false);

insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A');

insert into public.citas (id, organization_id, profesional_id, lugar_id, paciente_id, estado, inicio, fin, reagendada_desde) values
  -- Dentro de tres días
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'agendada',
   now() + interval '3 days', now() + interval '3 days 1 hour', null),
  -- Hace tres días
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'agendada',
   now() - interval '3 days', now() - interval '3 days' + interval '1 hour', null),
  -- Cancelada y ya reagendada (la nueva es la siguiente)
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'cancelada',
   now() + interval '5 days', now() + interval '5 days 1 hour', null),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'agendada',
   now() + interval '6 days', now() + interval '6 days 1 hour', 'e0000000-0000-4000-8000-000000000003');

-- Bloqueo dentro de cuatro días
insert into public.citas (id, organization_id, profesional_id, lugar_id, nota, inicio, fin) values
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Trámite', now() + interval '4 days', now() + interval '4 days 1 hour');

-- Como la admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- Estados y reglas de tiempo
select lives_ok(
  $$ update public.citas set estado = 'confirmada' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  '"Confirmó" antes de la hora de la cita'
);
select throws_ok(
  $$ update public.citas set estado = 'confirmada' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'RT002', 'La cita ya empezó: ya no hace falta confirmarla.',
  'No se confirma una cita que ya empezó'
);
select throws_ok(
  $$ update public.citas set estado = 'no_asistio' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'RT004', 'La cita todavía no empieza.',
  '"No asistió" no vale antes de la hora'
);
select throws_ok(
  $$ update public.citas set estado = 'atendida' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'RT003', 'Todavía no es el día de la cita.',
  '"Llegó" no vale antes del día de la cita'
);
select throws_ok(
  $$ update public.citas set estado = 'atendida' where id = 'e0000000-0000-4000-8000-000000000005' $$,
  'RT001', 'La cita ya cambió. Recarga la página.',
  'Un bloqueo no pasa a atendida'
);
select throws_ok(
  $$ update public.citas set estado = 'agendada' where id = 'e0000000-0000-4000-8000-000000000003' $$,
  'RT005', null,
  'Una cita ya reagendada no se reactiva'
);

-- Llegada
select lives_ok(
  $$ update public.citas set estado = 'atendida' where id = 'e0000000-0000-4000-8000-000000000002' $$,
  '"Llegó" en una cita que ya pasó'
);
select is(
  (select llegada_at from public.citas where id = 'e0000000-0000-4000-8000-000000000002'),
  now(),
  '"Llegó" guarda la hora de la base'
);
select throws_ok(
  $$ update public.citas set llegada_at = now() + interval '1 hour'
     where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'RT007', 'La hora de llegada no puede ser más tarde que ahora.',
  'La llegada no puede ser futura'
);
select lives_ok(
  $$ update public.citas set llegada_at = now() - interval '10 minutes'
     where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'Se puede corregir la llegada a una hora pasada'
);
select throws_ok(
  $$ update public.citas set llegada_at = now() - interval '1 hour'
     where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'RT006', 'Primero marca que llegó.',
  'Una cita no atendida no tiene hora de llegada'
);

-- Recordatorio
select lives_ok(
  $$ update public.citas set recordatorio_enviado_at = now() - interval '1 day'
     where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'Se marca el recordatorio de una cita que todavía no empieza'
);
select is(
  (select recordatorio_enviado_at from public.citas where id = 'e0000000-0000-4000-8000-000000000001'),
  now(),
  'El recordatorio guarda la hora de la base'
);
select throws_ok(
  $$ update public.citas set recordatorio_enviado_at = now()
     where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'RT008', null,
  'No se marca el recordatorio de una cita que ya pasó'
);

-- Extensión por llegada tarde: la cita dura 1 h y llegó hace 10 minutos.
select lives_ok(
  $$ update public.citas
     set fin_previsto = fin, fin = now() - interval '10 minutes' + interval '1 hour'
     where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'Se extiende hasta la duración acordada desde la llegada'
);
select throws_ok(
  $$ update public.citas set fin = now() + interval '2 hours'
     where id = 'e0000000-0000-4000-8000-000000000002' $$,
  'RT009', null,
  'No se extiende más que la duración acordada'
);

-- Citas nuevas
select throws_ok(
  $$ insert into public.citas (organization_id, profesional_id, lugar_id, paciente_id, estado, inicio, fin)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
       'c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'atendida',
       now() + interval '8 days', now() + interval '8 days 1 hour') $$,
  'RT010', null,
  'Una cita nueva empieza como agendada'
);

-- Reagendar al pasado
select throws_ok(
  $$ select public.reagendar_cita(
       'e0000000-0000-4000-8000-000000000001', 'cancelada', 'e1000000-0000-4000-8000-000000000001',
       'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
       now() - interval '1 day', now() - interval '1 day' + interval '1 hour', null, null) $$,
  'RT011', 'Elige un horario que todavía no haya pasado.',
  'No se reagenda a un horario que ya pasó'
);

-- Pacientes
select throws_ok(
  $$ insert into public.pacientes (organization_id, nombre, fecha_nacimiento)
     values ('a0000000-0000-4000-8000-000000000001', 'Paciente futuro',
       (now() at time zone 'America/La_Paz')::date + 1) $$,
  'PA001', 'La fecha de nacimiento no puede ser futura.',
  'La fecha de nacimiento no puede ser futura'
);

-- Horarios: el lunes de 10 a 13, vigente desde hace un mes
insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001', 1, '10:00', '13:00', current_date - 30);

select throws_ok(
  $$ insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
       'c0000000-0000-4000-8000-000000000001', 1, '12:00', '15:00') $$,
  '23P01', null,
  'Dos tramos de la misma profesional no se superponen'
);

-- Como superusuario (el seed y la preparación de las pruebas) no aplican las reglas.
reset role;
select lives_ok(
  $$ update public.horarios set vigente_hasta = current_date - 1 where dia_semana = 1;
     insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
     values ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
       'c0000000-0000-4000-8000-000000000001', 1, '12:00', '15:00', current_date) $$,
  'Un tramo cerrado ayer no choca con uno nuevo desde hoy'
);
select lives_ok(
  $$ update public.citas set estado = 'no_asistio' where id = 'e0000000-0000-4000-8000-000000000001' $$,
  'Las reglas de la app no se aplican fuera de la app'
);

select * from finish();
rollback;

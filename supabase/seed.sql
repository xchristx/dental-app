-- Datos de prueba para el entorno local y la demo.
-- Siempre inventados: nunca datos de pacientes reales (ver CLAUDE.md).
--
-- Las citas se ubican en la semana actual (lunes a domingo, hora de La Paz),
-- así la demo siempre muestra algo al reiniciarla.
-- Los pacientes no tienen teléfono: un número inventado podría ser de alguien real.

insert into public.organizaciones (id, nombre) values
  ('10000000-0000-4000-8000-000000000001', 'Consultorio de demostración');

-- Usuaria de la demo: la usa el botón "Entrar como demo". Su contraseña es
-- pública a propósito; solo ve esta organización de datos inventados.
-- Este seed nunca se aplica en producción.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', '70000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'demo@ejemplo.test',
  extensions.crypt('demo-sifel', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  gen_random_uuid(), '70000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  '{"sub": "70000000-0000-4000-8000-000000000001", "email": "demo@ejemplo.test", "email_verified": true}',
  'email', now(), now(), now()
);

insert into public.profesionales (id, organization_id, nombre, especialidad) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Dra. Laura Méndez', 'Odontología general'),
  -- Socia sin usuario: existe como profesional para que sus citas cuenten en los choques (0002).
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Dra. Rocío Paz', 'Ortodoncia');

-- La usuaria demo entra como Laura.
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('10000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'admin', '20000000-0000-4000-8000-000000000001');

insert into public.lugares (id, organization_id, nombre, color, controla_sillon) values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Consultorio', 'azul', true),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Clínica', 'verde', false),
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Consultorio de Rocío', 'morado', true);

insert into public.tipos_cita (id, organization_id, nombre, duracion_min) values
  ('40000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Control', 60),
  ('40000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Retiro de puntos', 15),
  ('40000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Cirugía', 90),
  ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Endodoncia', 60),
  ('40000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Control de ortodoncia', 30);

-- Laura: consultorio de lunes a viernes por la mañana, clínica martes y jueves
-- por la tarde, consultorio lunes, miércoles y viernes por la tarde.
-- Rocío usa el consultorio de Laura los jueves por la tarde.
insert into public.horarios (organization_id, profesional_id, lugar_id, dia_semana, hora_inicio, hora_fin, vigente_desde)
select '10000000-0000-4000-8000-000000000001', h.profesional::uuid, h.lugar::uuid, h.dia, h.desde::time, h.hasta::time, date '2026-01-01'
from (values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, '10:00', '13:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 2, '10:00', '13:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 3, '10:00', '13:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 4, '10:00', '13:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, '10:00', '13:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, '15:00', '21:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 3, '15:00', '21:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 5, '15:00', '21:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 2, '15:00', '18:00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 4, '15:00', '18:00'),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 4, '15:00', '19:00')
) as h(profesional, lugar, dia, desde, hasta);

insert into public.pacientes (id, organization_id, nombre, fecha_nacimiento) values
  ('50000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Camila Vargas', '1991-03-14'),
  ('50000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Martín Salazar', '1985-07-02'),
  ('50000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Lucía Fernández', '1998-11-23'),
  ('50000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Jorge Mamani', '1976-01-30'),
  ('50000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Valeria Gutiérrez', '2001-05-09'),
  ('50000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Sofía Céspedes', '2015-09-17'),
  ('50000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Diego Torrez', '1969-12-04'),
  ('50000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Andrés Quiroga', '1993-04-21'),
  ('50000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'Gabriel Ortiz', '1988-08-11'),
  ('50000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Paola Arce', '1995-02-27'),
  ('50000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'Mateo Flores', '2012-06-05');

-- dia: 0 lunes … 6 domingo de la semana actual. Horas locales de La Paz.
-- llegada: hora real de llegada, solo en las citas atendidas.
with semana as (
  select date_trunc('week', now() at time zone 'America/La_Paz')::date as lunes
)
insert into public.citas (
  id, organization_id, profesional_id, lugar_id, paciente_id, tipo_cita_id,
  nota, inicio, fin, estado, llegada_at
)
select
  c.id::uuid,
  '10000000-0000-4000-8000-000000000001',
  c.profesional::uuid,
  c.lugar::uuid,
  c.paciente::uuid,
  c.tipo::uuid,
  c.nota,
  ((s.lunes + c.dia) + c.desde::time) at time zone 'America/La_Paz',
  ((s.lunes + c.dia) + c.hasta::time) at time zone 'America/La_Paz',
  c.estado,
  ((s.lunes + c.dia) + c.llegada::time) at time zone 'America/La_Paz'
from semana s, (values
  -- Lunes
  ('60000000-0000-4000-8000-000000000001', 0, '10:00', '11:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', null, 'atendida', '09:58'),
  ('60000000-0000-4000-8000-000000000002', 0, '16:00', '17:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', null, 'atendida', '16:40'),
  -- Martes
  ('60000000-0000-4000-8000-000000000003', 1, '10:00', '11:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000001', null, 'atendida', '10:25'),
  ('60000000-0000-4000-8000-000000000004', 1, '11:15', '11:30', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', null, 'confirmada', null),
  ('60000000-0000-4000-8000-000000000005', 1, '15:00', '16:30', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', null, 'agendada', null),
  -- Miércoles
  ('60000000-0000-4000-8000-000000000006', 2, '10:00', '11:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000001', null, 'confirmada', null),
  ('60000000-0000-4000-8000-000000000007', 2, '17:00', '18:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000004', null, 'agendada', null),
  -- Jueves: un bloqueo por la mañana, clínica por la tarde y Rocío en el consultorio
  ('60000000-0000-4000-8000-000000000008', 3, '11:00', '12:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', null, null, 'Trámite en el banco', 'agendada', null),
  ('60000000-0000-4000-8000-000000000009', 3, '15:00', '16:30', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000003', null, 'agendada', null),
  ('60000000-0000-4000-8000-000000000010', 3, '16:00', '16:30', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000005', null, 'agendada', null),
  -- Viernes
  ('60000000-0000-4000-8000-000000000011', 4, '10:00', '11:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000004', null, 'agendada', null),
  ('60000000-0000-4000-8000-000000000012', 4, '18:00', '19:00', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000001', null, 'cancelada', null)
) as c(id, dia, desde, hasta, profesional, lugar, paciente, tipo, nota, estado, llegada);

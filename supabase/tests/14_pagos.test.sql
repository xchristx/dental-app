-- Presupuestos y libro de pagos (decisión 0026).
begin;
create extension if not exists pgtap with schema extensions;

select plan(16);

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

-- Una ortodoncia de 6500 Bs: 1000 de cuota inicial y cuotas de 400.
insert into public.presupuestos (id, organization_id, paciente_id, descripcion, total_centavos,
  cuota_inicial_centavos, cuota_sugerida_centavos, fecha) values
  ('e2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', ' Ortodoncia ', 650000, 100000, 40000,
   (now() at time zone 'America/La_Paz')::date);

create temporary view mov as
  select 'a0000000-0000-4000-8000-000000000001'::uuid as org,
         'e2000000-0000-4000-8000-000000000001'::uuid as pres,
         (now() at time zone 'America/La_Paz')::date as hoy;
grant select on mov to authenticated;

select is(
  (select row(descripcion, autor_id, profesional_id)::text from public.presupuestos
   where id = 'e2000000-0000-4000-8000-000000000001'),
  row('Ortodoncia', 'f0000000-0000-4000-8000-000000000001'::uuid,
      'b0000000-0000-4000-8000-000000000001'::uuid)::text,
  'el presupuesto toma el autor y la profesional de la sesión'
);

select lives_ok(
  $$insert into public.movimientos_pago (id, organization_id, presupuesto_id, tipo, monto_centavos, forma_pago, fecha)
    select 'e3000000-0000-4000-8000-000000000001', org, pres, 'pago', 100000, 'efectivo', hoy from mov$$,
  'se registra la cuota inicial'
);
select is(
  (select numero_recibo from public.movimientos_pago where id = 'e3000000-0000-4000-8000-000000000001'),
  1, 'el primer pago es el recibo 1'
);

select throws_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, forma_pago, fecha)
    select org, pres, 'pago', 550001, 'qr', hoy from mov$$,
  'PG001', null, 'un pago no supera el saldo'
);
select throws_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, motivo, fecha)
    select org, pres, 'ajuste', -550001, 'Descuento', hoy from mov$$,
  'PG002', null, 'un ajuste no deja el saldo negativo'
);
select throws_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, fecha)
    select org, pres, 'pago', 40000, hoy from mov$$,
  '23514', null, 'un pago lleva la forma de pago'
);
select throws_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, motivo, fecha)
    select org, pres, 'ajuste', 20000, '  ', hoy from mov$$,
  '23514', null, 'un ajuste lleva motivo'
);
select throws_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, forma_pago, fecha)
    select org, pres, 'pago', 40000, 'qr', hoy + 1 from mov$$,
  'PG005', null, 'la fecha no puede ser futura'
);

select lives_ok(
  $$insert into public.movimientos_pago (organization_id, presupuesto_id, tipo, monto_centavos, motivo, fecha)
    select org, pres, 'ajuste', 50000, 'Se agregó una endodoncia', hoy from mov$$,
  'un ajuste sube el saldo'
);
select lives_ok(
  $$insert into public.movimientos_pago (id, organization_id, presupuesto_id, tipo, monto_centavos, forma_pago, fecha)
    select 'e3000000-0000-4000-8000-000000000002', org, pres, 'pago', 40000, 'transferencia', hoy from mov$$,
  'se paga una cuota'
);
select is(
  public.saldo_presupuesto_centavos('e2000000-0000-4000-8000-000000000001'),
  560000::bigint,
  'saldo = total + ajustes − pagos'
);
select is(
  (select numero_recibo from public.movimientos_pago where id = 'e3000000-0000-4000-8000-000000000002'),
  2, 'los ajustes no llevan recibo: el siguiente pago es el 2'
);

select throws_ok(
  $$update public.movimientos_pago set monto_centavos = 1 where id = 'e3000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'un pago no se edita'
);
select throws_ok(
  $$update public.presupuestos set total_centavos = 700000 where id = 'e2000000-0000-4000-8000-000000000001'$$,
  'PG004', null, 'el total no se cambia: se registra un ajuste'
);
select throws_ok(
  $$update public.presupuestos set deleted_at = now() where id = 'e2000000-0000-4000-8000-000000000001'$$,
  'PG003', null, 'con movimientos, el presupuesto no se anula'
);

select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is(
  (select count(*) from public.movimientos_pago)::int + (select count(*) from public.presupuestos)::int, 0,
  'otra organización no ve los pagos'
);

select * from finish();
rollback;

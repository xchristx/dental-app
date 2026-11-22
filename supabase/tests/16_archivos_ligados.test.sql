-- La imagen de una Rx y el comprobante de un pago (decisión 0029).
begin;
create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated');
insert into public.organizaciones (id, nombre, permite_archivos) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A', true);
insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura');
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001');
insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Paciente B');
insert into public.odontograma_rx (id, organization_id, paciente_id, pieza, fecha, deleted_at) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 36, current_date, null),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 16, current_date, now());
insert into public.presupuestos (id, organization_id, paciente_id, descripcion, total_centavos, fecha) values
  ('e2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000001', 'Ortodoncia', 650000, current_date),
  ('e2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000002', 'Limpieza', 30000, current_date);
insert into public.movimientos_pago (id, organization_id, presupuesto_id, tipo, monto_centavos, forma_pago, motivo, fecha) values
  ('e3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'e2000000-0000-4000-8000-000000000001', 'pago', 40000, 'qr', null, current_date),
  ('e3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'e2000000-0000-4000-8000-000000000001', 'ajuste', -10000, null, 'Descuento', current_date),
  ('e3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001',
   'e2000000-0000-4000-8000-000000000002', 'pago', 30000, 'transferencia', null, current_date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- La imagen de una Rx.
select lives_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, rx_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'radiografia',
            'e0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/rx1.jpg',
            'image/jpeg', 1000, current_date)$$,
  'una Rx lleva su imagen'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, rx_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'foto',
            'e0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/rx2.jpg',
            'image/jpeg', 1000, current_date)$$,
  '23514', null, 'lo ligado a una Rx es una radiografía'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, rx_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'radiografia',
            'e0000000-0000-4000-8000-000000000002',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/rx3.jpg',
            'image/jpeg', 1000, current_date)$$,
  'AR005', null, 'no se liga a una Rx anulada'
);

-- El comprobante de un pago.
select lives_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, movimiento_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'comprobante',
            'e3000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/c1.jpg',
            'image/jpeg', 1000, current_date)$$,
  'un pago lleva su comprobante'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, movimiento_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'comprobante',
            'e3000000-0000-4000-8000-000000000002',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/c2.jpg',
            'image/jpeg', 1000, current_date)$$,
  'AR004', null, 'un ajuste no lleva comprobante'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, movimiento_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'comprobante',
            'e3000000-0000-4000-8000-000000000003',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/c3.jpg',
            'image/jpeg', 1000, current_date)$$,
  'AR002', null, 'el pago tiene que ser del mismo paciente'
);
select is(
  (select count(*)::int from public.archivos where movimiento_id = 'e3000000-0000-4000-8000-000000000001'),
  1,
  'el comprobante queda ligado al pago'
);

select * from finish();
rollback;

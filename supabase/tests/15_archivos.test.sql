-- Archivos de pacientes (decisión 0027).
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, aud, role) values
  ('f0000000-0000-4000-8000-000000000001', 'laura@ejemplo.test', 'authenticated', 'authenticated'),
  ('f0000000-0000-4000-8000-000000000002', 'otra-demo@ejemplo.test', 'authenticated', 'authenticated');
insert into public.organizaciones (id, nombre, permite_archivos) values
  ('a0000000-0000-4000-8000-000000000001', 'Organización A', true),
  ('a0000000-0000-4000-8000-000000000002', 'Demo', false);
insert into public.profesionales (id, organization_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Laura'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Demo');
insert into public.miembros (organization_id, user_id, rol, profesional_id) values
  ('a0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 'admin',
   'b0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'admin',
   'b0000000-0000-4000-8000-000000000002');
insert into public.pacientes (id, organization_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Paciente A'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Paciente B'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Paciente demo');
insert into public.odontograma_rx (id, organization_id, paciente_id, pieza, fecha) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000002', 36, current_date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$insert into public.archivos (id, organization_id, paciente_id, tipo, ruta, mime, bytes, nota, fecha)
    values ('e4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
            'd0000000-0000-4000-8000-000000000001', 'radiografia',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/e4000000-0000-4000-8000-000000000001.jpg',
            'image/jpeg', 350000, ' Panorámica ', (now() at time zone 'America/La_Paz')::date)$$,
  'se registra una radiografía'
);
select is(
  (select row(nota, autor_id)::text from public.archivos where id = 'e4000000-0000-4000-8000-000000000001'),
  row('Panorámica', 'f0000000-0000-4000-8000-000000000001'::uuid)::text,
  'la nota sin espacios y el autor desde la sesión'
);

select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'foto',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000002/x.jpg',
            'image/jpeg', 1000, current_date)$$,
  '23514', null, 'la ruta es la carpeta de su paciente'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'comprobante',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/y.jpg',
            'image/jpeg', 1000, current_date)$$,
  '23514', null, 'un comprobante va ligado a un pago'
);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, rx_id, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'radiografia',
            'e0000000-0000-4000-8000-000000000001',
            'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/z.jpg',
            'image/jpeg', 1000, current_date)$$,
  'AR002', null, 'la Rx tiene que ser del mismo paciente'
);
select throws_ok(
  $$update public.archivos set nota = 'Otra' where id = 'e4000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'un archivo no se edita'
);
select lives_ok(
  $$update public.archivos set deleted_at = now() where id = 'e4000000-0000-4000-8000-000000000001'$$,
  'se anula'
);

-- Storage: solo en la carpeta de la propia organización.
select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('archivos', 'a0000000-0000-4000-8000-000000000001/d0000000-0000-4000-8000-000000000001/a.jpg')$$,
  'sube a la carpeta de su organización'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('archivos', 'a0000000-0000-4000-8000-000000000002/d0000000-0000-4000-8000-000000000003/b.jpg')$$,
  '42501', null, 'no sube a otra organización'
);
-- Por la API tampoco: no hay política de delete.
select throws_ok(
  $$delete from storage.objects where bucket_id = 'archivos'$$,
  null, null, 'no se borra un archivo de Storage'
);

-- La demo no sube archivos.
select set_config('request.jwt.claims', '{"sub": "f0000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select throws_ok(
  $$insert into public.archivos (organization_id, paciente_id, tipo, ruta, mime, bytes, fecha)
    values ('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'foto',
            'a0000000-0000-4000-8000-000000000002/d0000000-0000-4000-8000-000000000003/c.jpg',
            'image/jpeg', 1000, current_date)$$,
  'AR001', null, 'la demo no registra archivos'
);
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('archivos', 'a0000000-0000-4000-8000-000000000002/d0000000-0000-4000-8000-000000000003/c.jpg')$$,
  '42501', null, 'ni los sube a Storage'
);

select * from finish();
rollback;

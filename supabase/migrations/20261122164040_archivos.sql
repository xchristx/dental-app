-- Archivos de pacientes (decisión 0027): radiografías, fotos y comprobantes en
-- Supabase Storage (bucket privado), con una fila por archivo en `archivos`.

-- La demo pública no sube archivos (su seed lo deja en false).
alter table public.organizaciones
  add column permite_archivos boolean not null default true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('archivos', 'archivos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

-- Para ligar un archivo a una Rx o a un pago de la misma organización.
alter table public.odontograma_rx
  add constraint odontograma_rx_organizacion_id_unico unique (organization_id, id);
alter table public.movimientos_pago
  add constraint movimientos_pago_organizacion_id_unico unique (organization_id, id);

create table public.archivos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  tipo text not null check (tipo in ('radiografia', 'foto', 'comprobante')),
  rx_id uuid,
  movimiento_id uuid,
  -- Ruta en el bucket: organización/paciente/archivo.
  ruta text not null unique,
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  bytes integer not null check (bytes between 1 and 10485760),
  nota text check (length(nota) <= 200),
  fecha date not null,
  autor_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint archivos_ruta_de_su_carpeta
    check (ruta like organization_id::text || '/' || paciente_id::text || '/%'),
  constraint archivos_rx_es_radiografia check (rx_id is null or tipo = 'radiografia'),
  constraint archivos_comprobante_de_un_pago check ((tipo = 'comprobante') = (movimiento_id is not null)),
  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, rx_id)
    references public.odontograma_rx (organization_id, id),
  foreign key (organization_id, movimiento_id)
    references public.movimientos_pago (organization_id, id)
);

create index archivos_paciente
  on public.archivos (organization_id, paciente_id, fecha desc)
  where deleted_at is null;

create trigger poner_updated_at before update on public.archivos
  for each row execute function public.poner_updated_at();

create function public.archivos_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nota := nullif(trim(new.nota), '');

  if not exists (
    select 1 from public.organizaciones o where o.id = new.organization_id and o.permite_archivos
  ) then
    raise exception 'En la demo no se suben archivos.' using errcode = 'AR001';
  end if;

  if new.rx_id is not null and not exists (
    select 1 from public.odontograma_rx x where x.id = new.rx_id and x.paciente_id = new.paciente_id
  ) then
    raise exception 'La Rx es de otro paciente.' using errcode = 'AR002';
  end if;
  if new.movimiento_id is not null and not exists (
    select 1 from public.movimientos_pago m
    join public.presupuestos p on p.id = m.presupuesto_id
    where m.id = new.movimiento_id and p.paciente_id = new.paciente_id
  ) then
    raise exception 'El pago es de otro paciente.' using errcode = 'AR002';
  end if;

  if current_user = 'authenticated' then
    new.autor_id := auth.uid();
    new.created_at := now();
    new.deleted_at := null;
    if new.fecha > (now() at time zone 'America/La_Paz')::date then
      raise exception 'La fecha no puede ser futura.' using errcode = 'AR003';
    end if;
  end if;
  return new;
end;
$$;

create trigger archivos_reglas
  before insert on public.archivos
  for each row execute function public.archivos_reglas();

-- ---------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------

alter table public.archivos enable row level security;

create policy "archivos: leer en mi organización" on public.archivos
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "archivos: agregar en mi organización" on public.archivos
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "archivos: anular en mi organización" on public.archivos
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

-- Un archivo no se edita: solo se anula.
revoke update, delete, truncate on public.archivos from anon, authenticated;
grant update (deleted_at) on public.archivos to authenticated;

-- Storage: cada organización lee y sube solo en su carpeta. No se modifica
-- ni se borra (no hay políticas de update ni delete).
create policy "archivos: leer de mi organización" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'archivos'
    and exists (
      select 1 from public.organizaciones o
      where o.id::text = (storage.foldername(name))[1]
        and o.id in (select public.org_ids_del_usuario())
    )
  );

create policy "archivos: subir a mi organización" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'archivos'
    and exists (
      select 1 from public.organizaciones o
      where o.id::text = (storage.foldername(name))[1]
        and o.id in (select public.org_ids_del_usuario())
        and o.permite_archivos
    )
  );

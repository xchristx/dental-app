-- Radiografías en el odontograma (decisión 0023): la columna Rx de su ficha.
-- Una fila por pieza y fecha en que se tomó la radiografía.

create table public.odontograma_rx (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  -- FDI: permanentes 11–48 y temporales 51–85, como en odontograma_registros.
  pieza smallint not null check (
    (pieza / 10 between 1 and 4 and pieza % 10 between 1 and 8)
    or (pieza / 10 between 5 and 8 and pieza % 10 between 1 and 5)
  ),
  fecha date not null,
  nota text check (length(nota) <= 200),
  autor_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id)
);

create index odontograma_rx_paciente
  on public.odontograma_rx (organization_id, paciente_id)
  where deleted_at is null;

create trigger poner_updated_at before update on public.odontograma_rx
  for each row execute function public.poner_updated_at();

create function public.odontograma_rx_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.nota := nullif(trim(new.nota), '');
  if current_user = 'authenticated' then
    if tg_op = 'INSERT' then
      new.autor_id := auth.uid();
      new.created_at := now();
    else
      new.organization_id := old.organization_id;
      new.paciente_id := old.paciente_id;
      new.autor_id := old.autor_id;
      new.created_at := old.created_at;
    end if;
    if new.fecha > (now() at time zone 'America/La_Paz')::date then
      raise exception 'La fecha no puede ser futura.' using errcode = 'OD003';
    end if;
  end if;
  return new;
end;
$$;

create trigger odontograma_rx_reglas
  before insert or update on public.odontograma_rx
  for each row execute function public.odontograma_rx_reglas();

alter table public.odontograma_rx enable row level security;

create policy "odontograma_rx: leer en mi organización" on public.odontograma_rx
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "odontograma_rx: crear en mi organización" on public.odontograma_rx
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "odontograma_rx: editar en mi organización" on public.odontograma_rx
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

revoke delete, truncate on public.odontograma_rx from anon, authenticated;

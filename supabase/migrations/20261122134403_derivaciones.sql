-- Derivaciones (decisión 0019): "derivado por" (recibida) y "derivado a"
-- (enviada), a una profesional de la organización o a alguien de afuera.

create table public.derivaciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  sentido text not null check (sentido in ('recibida', 'enviada')),
  -- Una profesional de la organización (por ejemplo, una socia)…
  profesional_id uuid,
  -- …o alguien de afuera, por su nombre.
  contacto text check (length(contacto) <= 200),
  motivo text check (length(motivo) <= 2000),
  fecha date not null,
  autor_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint derivaciones_con_quien check (profesional_id is not null or contacto is not null),

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index derivaciones_paciente
  on public.derivaciones (organization_id, paciente_id, fecha desc)
  where deleted_at is null;

create trigger poner_updated_at before update on public.derivaciones
  for each row execute function public.poner_updated_at();

create function public.derivaciones_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.contacto := nullif(trim(new.contacto), '');
  new.motivo := nullif(trim(new.motivo), '');
  -- Con profesional, el nombre de afuera sobra.
  if new.profesional_id is not null then
    new.contacto := null;
  end if;

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
      raise exception 'La fecha no puede ser futura.' using errcode = 'DR001';
    end if;
  end if;
  return new;
end;
$$;

create trigger derivaciones_reglas
  before insert or update on public.derivaciones
  for each row execute function public.derivaciones_reglas();

alter table public.derivaciones enable row level security;

create policy "derivaciones: leer en mi organización" on public.derivaciones
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "derivaciones: crear en mi organización" on public.derivaciones
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "derivaciones: editar en mi organización" on public.derivaciones
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

revoke delete, truncate on public.derivaciones from anon, authenticated;

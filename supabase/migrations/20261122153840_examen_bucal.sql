-- Examen bucal (decisión 0024): los datos generales de la hoja del
-- odontograma. Solo se agregan versiones, como la anamnesis (0018); la
-- vigente es la última. En las preguntas, null es "sin dato".

create table public.examen_bucal (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  usa_mondadientes boolean,
  cepilla_lengua boolean,
  tartaro boolean,
  halitosis boolean,
  placa_bacteriana boolean,
  materia_alba boolean,
  oclusion text check (length(oclusion) <= 200),
  observaciones text check (length(observaciones) <= 2000),
  autor_id uuid references auth.users (id),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index examen_bucal_paciente
  on public.examen_bucal (organization_id, paciente_id, created_at desc)
  where deleted_at is null;

create trigger poner_updated_at before update on public.examen_bucal
  for each row execute function public.poner_updated_at();

create function public.examen_bucal_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.oclusion := nullif(trim(new.oclusion), '');
  new.observaciones := nullif(trim(new.observaciones), '');

  if current_user = 'authenticated' then
    new.autor_id := auth.uid();
    new.profesional_id := public.profesional_del_usuario(new.organization_id);
    new.created_at := now();
    new.deleted_at := null;
  end if;
  return new;
end;
$$;

create trigger examen_bucal_reglas
  before insert on public.examen_bucal
  for each row execute function public.examen_bucal_reglas();

alter table public.examen_bucal enable row level security;

create policy "examen_bucal: leer en mi organización" on public.examen_bucal
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "examen_bucal: agregar en mi organización" on public.examen_bucal
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

-- Solo se agregan versiones.
revoke update, delete, truncate on public.examen_bucal from anon, authenticated;

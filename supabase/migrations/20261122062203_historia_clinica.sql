-- Historia clínica, primera parte (decisión 0018): anamnesis y evolución.
--
-- - anamnesis: solo se agregan versiones; la vigente es la última.
-- - evoluciones: quien la escribió la corrige o la borra solo el mismo día
--   (La Paz). Después queda fija.
-- - Quién la escribió lo completa un trigger desde la sesión.
--
-- Los triggers solo actúan para `authenticated` (la web), como en la 0017:
-- el seed y las pruebas cargan datos como superusuario.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.anamnesis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  antecedentes_personales text check (length(antecedentes_personales) <= 4000),
  antecedentes_familiares text check (length(antecedentes_familiares) <= 4000),
  alergias text check (length(alergias) <= 4000),
  sin_alergias boolean not null default false,
  medicamentos text check (length(medicamentos) <= 4000),
  autor_id uuid references auth.users (id),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- "Sin alergias conocidas" no convive con alergias escritas.
  constraint anamnesis_sin_alergias_sin_texto check (not (sin_alergias and alergias is not null)),

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index anamnesis_vigente
  on public.anamnesis (organization_id, paciente_id, created_at desc)
  where deleted_at is null;

create table public.evoluciones (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  -- La cita en la que se hizo, si la hay.
  cita_id uuid,
  -- Día en que se hizo (no un instante): se muestra tal cual.
  fecha date not null,
  texto text not null check (length(trim(texto)) > 0 and length(texto) <= 4000),
  autor_id uuid references auth.users (id),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, cita_id)
    references public.citas (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index evoluciones_paciente
  on public.evoluciones (organization_id, paciente_id, fecha desc)
  where deleted_at is null;

create index evoluciones_cita
  on public.evoluciones (cita_id)
  where deleted_at is null and cita_id is not null;

create trigger poner_updated_at before update on public.anamnesis
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.evoluciones
  for each row execute function public.poner_updated_at();

-- ---------------------------------------------------------------------------
-- Anamnesis: textos vacíos como null y autor desde la sesión
-- ---------------------------------------------------------------------------

create function public.anamnesis_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.antecedentes_personales := nullif(trim(new.antecedentes_personales), '');
  new.antecedentes_familiares := nullif(trim(new.antecedentes_familiares), '');
  new.alergias := nullif(trim(new.alergias), '');
  new.medicamentos := nullif(trim(new.medicamentos), '');

  if current_user = 'authenticated' then
    new.autor_id := auth.uid();
    new.profesional_id := public.profesional_del_usuario(new.organization_id);
    new.created_at := now();
    new.deleted_at := null;
  end if;
  return new;
end;
$$;

create trigger anamnesis_reglas
  before insert on public.anamnesis
  for each row execute function public.anamnesis_reglas();

-- ---------------------------------------------------------------------------
-- Evoluciones
-- ---------------------------------------------------------------------------

create function public.evoluciones_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  hoy date := (now() at time zone 'America/La_Paz')::date;
  paciente_de_la_cita uuid;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.autor_id := auth.uid();
    new.profesional_id := public.profesional_del_usuario(new.organization_id);
    new.created_at := now();
    new.deleted_at := null;
  else
    if old.autor_id is distinct from auth.uid() then
      raise exception 'Solo quien escribió la evolución la puede cambiar.' using errcode = 'EV001';
    end if;
    if (old.created_at at time zone 'America/La_Paz')::date <> hoy then
      raise exception 'Una evolución solo se corrige el mismo día. Agrega una nueva para aclararla.'
        using errcode = 'EV002';
    end if;
    -- Lo que identifica la entrada no cambia.
    new.organization_id := old.organization_id;
    new.paciente_id := old.paciente_id;
    new.autor_id := old.autor_id;
    new.profesional_id := old.profesional_id;
    new.created_at := old.created_at;
  end if;

  if new.fecha > hoy then
    raise exception 'La fecha no puede ser futura.' using errcode = 'EV003';
  end if;

  if new.cita_id is not null then
    select c.paciente_id into paciente_de_la_cita from public.citas c where c.id = new.cita_id;
    if paciente_de_la_cita is distinct from new.paciente_id then
      raise exception 'La cita es de otro paciente.' using errcode = 'EV004';
    end if;
  end if;

  return new;
end;
$$;

create trigger evoluciones_reglas
  before insert or update on public.evoluciones
  for each row execute function public.evoluciones_reglas();

-- ---------------------------------------------------------------------------
-- Permisos por fila (RLS). Todos los miembros de la organización (0018).
-- ---------------------------------------------------------------------------

alter table public.anamnesis enable row level security;
alter table public.evoluciones enable row level security;

create policy "anamnesis: leer en mi organización" on public.anamnesis
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "anamnesis: agregar en mi organización" on public.anamnesis
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "evoluciones: leer en mi organización" on public.evoluciones
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "evoluciones: crear en mi organización" on public.evoluciones
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

-- Quién y hasta cuándo lo controla evoluciones_reglas.
create policy "evoluciones: editar en mi organización" on public.evoluciones
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

-- La anamnesis solo se agrega; las evoluciones se borran con deleted_at.
revoke update, delete, truncate on public.anamnesis from anon, authenticated;
revoke delete, truncate on public.evoluciones from anon, authenticated;

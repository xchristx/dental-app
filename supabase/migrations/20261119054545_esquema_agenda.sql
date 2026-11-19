-- Esquema de la agenda (MVP 1).
--
-- Decisiones que implementa:
--   0002: profesionales, lugares y choques por profesional y por sillón.
--   0003: UUID del cliente, created_at/updated_at/deleted_at, borrado suave.
--   0004: horarios de atención (time local) y margen de traslado.
--   0005: estados de la cita, hora de llegada y recordatorio.
--   0007: miembros y RLS con org_ids_del_usuario().
--
-- Los id tienen un valor por defecto solo como respaldo: los genera el cliente.

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------------
-- Funciones comunes
-- ---------------------------------------------------------------------------

create function public.poner_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  zona_horaria text not null default 'America/La_Paz',
  moneda char(3) not null default 'BOB',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  nombre text not null check (length(trim(nombre)) > 0),
  especialidad text,
  -- Margen entre citas seguidas en lugares distintos (0004).
  margen_traslado_min integer not null default 30 check (margen_traslado_min between 0 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Para las claves foráneas compuestas: lo que se relaciona es siempre de la misma organización.
  unique (organization_id, id)
);

create table public.lugares (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  nombre text not null check (length(trim(nombre)) > 0),
  -- Uno de los colores de lugar de docs/diseno.md. El rojo no está: es para los choques.
  color text not null default 'gris'
    check (color in ('azul', 'verde', 'amarillo', 'morado', 'terracota', 'gris')),
  -- true: un solo sillón, no admite dos citas a la vez (0002).
  controla_sillon boolean not null default false,
  direccion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);

-- Tipos de cita con su duración sugerida. Es un catálogo editable, no una lista fija.
create table public.tipos_cita (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  nombre text not null check (length(trim(nombre)) > 0),
  duracion_min integer not null check (duracion_min between 5 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);

create unique index tipos_cita_nombre_unico
  on public.tipos_cita (organization_id, lower(nombre))
  where deleted_at is null;

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  nombre text not null check (length(trim(nombre)) > 0),
  telefono text,
  fecha_nacimiento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);

-- Usuario + organización + rol + profesional opcional (0007).
create table public.miembros (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  user_id uuid not null references auth.users (id),
  rol text not null check (rol in ('admin', 'profesional')),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create unique index miembros_usuario_unico
  on public.miembros (organization_id, user_id)
  where deleted_at is null;

create index miembros_user_id
  on public.miembros (user_id)
  where deleted_at is null;

-- Horarios de atención (0004). Las horas son `time` local de America/La_Paz:
-- un horario no es un instante, es "todos los martes a las 15:00".
-- Para cambiar un horario se cierra con vigente_hasta y se crea otro.
create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  profesional_id uuid not null,
  lugar_id uuid not null,
  -- ISO 8601: 1 lunes … 7 domingo.
  dia_semana smallint not null check (dia_semana between 1 and 7),
  hora_inicio time not null,
  hora_fin time not null,
  vigente_desde date not null default (now() at time zone 'America/La_Paz')::date,
  vigente_hasta date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint horarios_fin_despues_de_inicio check (hora_fin > hora_inicio),
  constraint horarios_vigencia_valida check (vigente_hasta is null or vigente_hasta >= vigente_desde),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id),
  foreign key (organization_id, lugar_id)
    references public.lugares (organization_id, id)
);

create index horarios_profesional
  on public.horarios (organization_id, profesional_id)
  where deleted_at is null;

-- Citas y bloqueos (una cita sin paciente es un bloqueo).
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  profesional_id uuid not null,
  lugar_id uuid not null,
  paciente_id uuid,
  tipo_cita_id uuid,
  -- Motivo de un bloqueo ("Trámite en el banco") o una nota corta de la cita.
  nota text,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'agendada'
    check (estado in ('agendada', 'confirmada', 'atendida', 'no_asistio', 'cancelada')),
  llegada_at timestamptz,
  recordatorio_enviado_at timestamptz,
  -- Copia de lugares.controla_sillon, porque una restricción de exclusión no
  -- puede leer otra tabla. La mantienen los triggers de abajo; no se edita a mano.
  lugar_controla_sillon boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint citas_fin_despues_de_inicio check (fin > inicio),
  -- Un bloqueo solo usa agendada y cancelada (0005).
  constraint citas_estados_de_bloqueo check (paciente_id is not null or estado in ('agendada', 'cancelada')),

  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id),
  foreign key (organization_id, lugar_id)
    references public.lugares (organization_id, id),
  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, tipo_cita_id)
    references public.tipos_cita (organization_id, id),

  -- Choques (0002 y 0005). Solo cuentan agendada, confirmada y atendida.
  -- Debe coincidir con ESTADOS_QUE_OCUPAN de @dental/core.
  constraint citas_sin_choque_profesional exclude using gist (
    profesional_id with =,
    tstzrange(inicio, fin, '[)') with &&
  ) where (deleted_at is null and estado in ('agendada', 'confirmada', 'atendida')),

  constraint citas_sin_choque_sillon exclude using gist (
    lugar_id with =,
    tstzrange(inicio, fin, '[)') with &&
  ) where (deleted_at is null and lugar_controla_sillon and estado in ('agendada', 'confirmada', 'atendida'))
);

create index citas_por_fecha
  on public.citas (organization_id, inicio)
  where deleted_at is null;

create index citas_paciente
  on public.citas (organization_id, paciente_id)
  where deleted_at is null and paciente_id is not null;

-- ---------------------------------------------------------------------------
-- Copia de controla_sillon en las citas
-- ---------------------------------------------------------------------------

-- Siempre se recalcula desde el lugar, así no se puede saltear el choque
-- cambiando la copia a mano.
create function public.citas_copiar_controla_sillon()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.lugar_controla_sillon := coalesce(
    (select l.controla_sillon from public.lugares l where l.id = new.lugar_id),
    false
  );
  return new;
end;
$$;

create trigger citas_copiar_controla_sillon
  before insert or update on public.citas
  for each row execute function public.citas_copiar_controla_sillon();

-- Si un lugar pasa a controlar el sillón, sus citas se actualizan. Si ya
-- tiene citas superpuestas, la restricción de exclusión rechaza el cambio.
create function public.lugares_propagar_controla_sillon()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.citas
  set lugar_controla_sillon = new.controla_sillon
  where lugar_id = new.id;
  return null;
end;
$$;

create trigger lugares_propagar_controla_sillon
  after update of controla_sillon on public.lugares
  for each row
  when (old.controla_sillon is distinct from new.controla_sillon)
  execute function public.lugares_propagar_controla_sillon();

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------

create trigger poner_updated_at before update on public.organizaciones
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.profesionales
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.lugares
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.tipos_cita
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.pacientes
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.miembros
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.horarios
  for each row execute function public.poner_updated_at();
create trigger poner_updated_at before update on public.citas
  for each row execute function public.poner_updated_at();

-- ---------------------------------------------------------------------------
-- Permisos por fila (RLS)
-- ---------------------------------------------------------------------------

-- Organizaciones del usuario actual (0007). Ninguna política compara con un
-- organization_id fijo. security definer para poder leer miembros sin
-- depender de su propia política.
create function public.org_ids_del_usuario()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.organization_id
  from public.miembros m
  where m.user_id = (select auth.uid())
    and m.deleted_at is null
$$;

revoke execute on function public.org_ids_del_usuario() from public, anon;
grant execute on function public.org_ids_del_usuario() to authenticated;

alter table public.organizaciones enable row level security;
alter table public.miembros enable row level security;

-- Organizaciones y miembros: solo lectura. Por ahora se administran con la
-- clave de servicio (invitaciones, 0007).
create policy "organizaciones: leer las mías" on public.organizaciones
  for select to authenticated
  using (id in (select public.org_ids_del_usuario()));

create policy "miembros: leer los de mi organización" on public.miembros
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

-- Datos de la agenda: leer, crear y editar dentro de mis organizaciones.
-- No hay política de borrado: se usa deleted_at (0003).
do $$
declare
  tabla text;
begin
  foreach tabla in array array['profesionales', 'lugares', 'tipos_cita', 'pacientes', 'horarios', 'citas']
  loop
    execute format('alter table public.%I enable row level security', tabla);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using (organization_id in (select public.org_ids_del_usuario()))',
      tabla || ': leer en mi organización', tabla);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (organization_id in (select public.org_ids_del_usuario()))',
      tabla || ': crear en mi organización', tabla);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using (organization_id in (select public.org_ids_del_usuario()))
         with check (organization_id in (select public.org_ids_del_usuario()))',
      tabla || ': editar en mi organización', tabla);
  end loop;
end;
$$;

-- Borrado suave: nadie borra filas desde la API.
revoke delete, truncate on
  public.organizaciones, public.miembros, public.profesionales, public.lugares,
  public.tipos_cita, public.pacientes, public.horarios, public.citas
from anon, authenticated;

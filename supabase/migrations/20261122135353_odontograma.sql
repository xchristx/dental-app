-- Odontograma (decisión 0020): catálogo editable de códigos por organización
-- y registros por pieza (FDI), con caras y grado.

-- ---------------------------------------------------------------------------
-- Catálogo de códigos
-- ---------------------------------------------------------------------------

create table public.odontograma_codigos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  abreviatura text not null check (length(trim(abreviatura)) between 1 and 8),
  nombre text not null check (length(trim(nombre)) between 1 and 80),
  -- hallazgo: rojo, a tratar. realizado: azul, hecho o en buen estado.
  tipo text not null check (tipo in ('hallazgo', 'realizado')),
  -- Cómo se dibuja en el gráfico. Las formas son fijas; los códigos, no.
  simbolo text not null
    check (simbolo in ('superficie', 'cruz', 'circulo', 'linea_vertical', 'linea_horizontal', 'texto')),
  por_caras boolean not null default false,
  usa_grado boolean not null default false,
  -- En qué índice cuenta (CPO-D y ceo-d, Normas en Salud Oral 2010).
  indice text check (indice in ('cariado', 'perdido', 'obturado')),
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- Pintar las caras solo tiene sentido si el código va por caras.
  constraint odontograma_codigos_superficie_por_caras check (simbolo <> 'superficie' or por_caras),
  unique (organization_id, id)
);

create unique index odontograma_codigos_abreviatura_unica
  on public.odontograma_codigos (organization_id, lower(abreviatura))
  where deleted_at is null;

create trigger poner_updated_at before update on public.odontograma_codigos
  for each row execute function public.poner_updated_at();

-- Catálogo inicial con las normas generales (0020). Se edita después.
create function public.odontograma_catalogo_inicial(org uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.odontograma_codigos
    (organization_id, abreviatura, nombre, tipo, simbolo, por_caras, usa_grado, indice, orden)
  values
    (org, 'C',    'Caries',                  'hallazgo',  'superficie',       true,  true,  'cariado',  10),
    (org, 'Rec',  'Caries recidivante',      'hallazgo',  'superficie',       true,  false, 'cariado',  20),
    (org, 'ObtD', 'Obturación defectuosa',   'hallazgo',  'superficie',       true,  false, null,       30),
    (org, 'Fx',   'Fractura',                'hallazgo',  'texto',            false, false, null,       40),
    (org, 'RR',   'Resto radicular',         'hallazgo',  'texto',            false, false, 'cariado',  50),
    (org, 'Ext',  'Extracción indicada',     'hallazgo',  'cruz',             false, false, 'perdido',  60),
    (org, 'EndI', 'Endodoncia indicada',     'hallazgo',  'linea_vertical',   false, false, null,       70),
    (org, 'MV',   'Mesioversión',            'hallazgo',  'texto',            false, false, null,       80),
    (org, 'DV',   'Distoversión',            'hallazgo',  'texto',            false, false, null,       90),
    (org, 'GV',   'Giroversión',             'hallazgo',  'texto',            false, false, null,      100),
    (org, 'Obt',  'Obturación',              'realizado', 'superficie',       true,  false, 'obturado', 110),
    (org, 'Inc',  'Incrustación',            'realizado', 'superficie',       true,  false, 'obturado', 120),
    (org, 'S',    'Sellante',                'realizado', 'texto',            false, false, null,      130),
    (org, 'Cor',  'Corona',                  'realizado', 'circulo',          false, false, 'obturado', 140),
    (org, 'End',  'Endodoncia',              'realizado', 'linea_vertical',   false, false, null,      150),
    (org, 'PC',   'Perdida por caries',      'realizado', 'cruz',             false, false, 'perdido', 160),
    (org, 'Aus',  'Ausente',                 'realizado', 'linea_horizontal', false, false, null,      170),
    (org, 'Imp',  'Implante',                'realizado', 'texto',            false, false, null,      180),
    (org, 'PF',   'Prótesis fija',           'realizado', 'texto',            false, false, null,      190)
$$;

revoke execute on function public.odontograma_catalogo_inicial(uuid) from public, anon, authenticated;

create function public.organizaciones_catalogo_inicial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.odontograma_catalogo_inicial(new.id);
  return null;
end;
$$;

create trigger organizaciones_catalogo_inicial
  after insert on public.organizaciones
  for each row execute function public.organizaciones_catalogo_inicial();

-- Las organizaciones que ya existen.
select public.odontograma_catalogo_inicial(o.id) from public.organizaciones o;

-- ---------------------------------------------------------------------------
-- Registros
-- ---------------------------------------------------------------------------

create table public.odontograma_registros (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  -- Sin código, el registro es una nota sobre la pieza.
  codigo_id uuid,
  -- FDI: permanentes 11–48 y temporales 51–85 (Normas en Salud Oral 2010).
  pieza smallint not null check (
    (pieza / 10 between 1 and 4 and pieza % 10 between 1 and 8)
    or (pieza / 10 between 5 and 8 and pieza % 10 between 1 and 5)
  ),
  -- Oclusal (o incisal), mesial, distal, vestibular y lingual (o palatina).
  caras text[] check (caras <@ array['O', 'M', 'D', 'V', 'L']),
  grado smallint check (grado between 1 and 4),
  nota text check (length(nota) <= 500),
  fecha date not null,
  autor_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint odontograma_registros_codigo_o_nota check (codigo_id is not null or nota is not null),

  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, codigo_id)
    references public.odontograma_codigos (organization_id, id)
);

create index odontograma_registros_paciente
  on public.odontograma_registros (organization_id, paciente_id)
  where deleted_at is null;

create trigger poner_updated_at before update on public.odontograma_registros
  for each row execute function public.poner_updated_at();

create function public.odontograma_registros_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  por_caras boolean := false;
  usa_grado boolean := false;
begin
  -- Sin código (una nota sola), no lleva caras ni grado.
  if new.codigo_id is not null then
    select c.por_caras, c.usa_grado into por_caras, usa_grado
    from public.odontograma_codigos c where c.id = new.codigo_id;
  end if;

  -- Caras sin repetir y siempre en el mismo orden.
  new.caras := nullif(array(
    select t.cara from unnest(array['O', 'M', 'D', 'V', 'L']) with ordinality as t(cara, n)
    where t.cara = any(new.caras)
    order by t.n
  ), '{}');
  if por_caras and new.caras is null then
    raise exception 'Elige al menos una cara.' using errcode = 'OD001';
  end if;
  if not por_caras then
    new.caras := null;
  end if;
  if new.grado is not null and not usa_grado then
    raise exception 'Este código no lleva grado.' using errcode = 'OD002';
  end if;
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

create trigger odontograma_registros_reglas
  before insert or update on public.odontograma_registros
  for each row execute function public.odontograma_registros_reglas();

-- ---------------------------------------------------------------------------
-- Permisos por fila (RLS)
-- ---------------------------------------------------------------------------

alter table public.odontograma_codigos enable row level security;
alter table public.odontograma_registros enable row level security;

-- El catálogo lo ven todas; lo cambia la admin (como las profesionales, 0014).
create policy "odontograma_codigos: leer en mi organización" on public.odontograma_codigos
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "odontograma_codigos: crear si soy admin" on public.odontograma_codigos
  for insert to authenticated
  with check (public.es_admin_de(organization_id));

create policy "odontograma_codigos: editar si soy admin" on public.odontograma_codigos
  for update to authenticated
  using (public.es_admin_de(organization_id))
  with check (public.es_admin_de(organization_id));

create policy "odontograma_registros: leer en mi organización" on public.odontograma_registros
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "odontograma_registros: crear en mi organización" on public.odontograma_registros
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "odontograma_registros: editar en mi organización" on public.odontograma_registros
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

revoke delete, truncate on public.odontograma_codigos, public.odontograma_registros
  from anon, authenticated;

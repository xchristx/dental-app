-- Presupuestos y libro de pagos (decisión 0026). Reglas de dinero de la 0003:
-- montos en centavos (bigint) con su moneda, pagos de solo agregar y saldo
-- calculado, nunca guardado.

-- ---------------------------------------------------------------------------
-- Presupuestos
-- ---------------------------------------------------------------------------

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  paciente_id uuid not null,
  descripcion text not null check (length(trim(descripcion)) between 1 and 120),
  total_centavos bigint not null check (total_centavos > 0),
  cuota_inicial_centavos bigint check (cuota_inicial_centavos > 0),
  cuota_sugerida_centavos bigint check (cuota_sugerida_centavos > 0),
  moneda text not null default 'BOB' check (moneda = 'BOB'),
  fecha date not null,
  autor_id uuid references auth.users (id),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint presupuestos_cuota_inicial_hasta_total
    check (cuota_inicial_centavos is null or cuota_inicial_centavos <= total_centavos),
  unique (organization_id, id),
  foreign key (organization_id, paciente_id)
    references public.pacientes (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index presupuestos_paciente
  on public.presupuestos (organization_id, paciente_id)
  where deleted_at is null;

create trigger poner_updated_at before update on public.presupuestos
  for each row execute function public.poner_updated_at();

-- ---------------------------------------------------------------------------
-- Movimientos: pagos y ajustes. Solo se agregan.
-- ---------------------------------------------------------------------------

create table public.movimientos_pago (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizaciones (id),
  presupuesto_id uuid not null,
  tipo text not null check (tipo in ('pago', 'ajuste')),
  -- Pago: positivo. Ajuste: positivo sube el saldo, negativo lo baja.
  monto_centavos bigint not null check (monto_centavos <> 0),
  moneda text not null default 'BOB' check (moneda = 'BOB'),
  forma_pago text check (forma_pago in ('efectivo', 'qr', 'transferencia')),
  motivo text check (length(motivo) <= 300),
  fecha date not null,
  -- Correlativo por organización; lo asigna el trigger (0003).
  numero_recibo integer,
  autor_id uuid references auth.users (id),
  profesional_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint movimientos_pago_forma
    check ((tipo = 'pago') = (forma_pago is not null)),
  constraint movimientos_pago_positivo
    check (tipo <> 'pago' or monto_centavos > 0),
  constraint movimientos_ajuste_motivo
    check (tipo <> 'ajuste' or (motivo is not null and length(trim(motivo)) > 0)),
  foreign key (organization_id, presupuesto_id)
    references public.presupuestos (organization_id, id),
  foreign key (organization_id, profesional_id)
    references public.profesionales (organization_id, id)
);

create index movimientos_pago_presupuesto
  on public.movimientos_pago (presupuesto_id, fecha, created_at);

create unique index movimientos_pago_recibo_unico
  on public.movimientos_pago (organization_id, numero_recibo)
  where numero_recibo is not null;

create trigger poner_updated_at before update on public.movimientos_pago
  for each row execute function public.poner_updated_at();

-- Último número de recibo de cada organización.
create table public.recibos_contador (
  organization_id uuid primary key references public.organizaciones (id),
  ultimo integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Reglas
-- ---------------------------------------------------------------------------

create function public.saldo_presupuesto_centavos(presupuesto uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select p.total_centavos + coalesce(sum(
    case m.tipo when 'pago' then -m.monto_centavos else m.monto_centavos end
  ), 0)
  from public.presupuestos p
  left join public.movimientos_pago m on m.presupuesto_id = p.id and m.deleted_at is null
  where p.id = presupuesto
  group by p.id
$$;

create function public.presupuestos_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.descripcion := trim(new.descripcion);
  if tg_op = 'INSERT' then
    if current_user = 'authenticated' then
      new.autor_id := auth.uid();
      new.profesional_id := public.profesional_del_usuario(new.organization_id);
      new.created_at := now();
      if new.fecha > (now() at time zone 'America/La_Paz')::date then
        raise exception 'La fecha no puede ser futura.' using errcode = 'PG005';
      end if;
    end if;
    return new;
  end if;

  -- El total y la cuota inicial no cambian: los pagos se calcularon sobre ellos.
  if (new.total_centavos, new.cuota_inicial_centavos, new.moneda, new.paciente_id,
      new.organization_id, new.fecha)
     is distinct from
     (old.total_centavos, old.cuota_inicial_centavos, old.moneda, old.paciente_id,
      old.organization_id, old.fecha) then
    raise exception 'El total no se cambia: registra un ajuste.' using errcode = 'PG004';
  end if;
  new.autor_id := old.autor_id;
  new.profesional_id := old.profesional_id;
  new.created_at := old.created_at;

  -- Con movimientos, no se anula.
  if new.deleted_at is not null and old.deleted_at is null and exists (
    select 1 from public.movimientos_pago m
    where m.presupuesto_id = old.id and m.deleted_at is null
  ) then
    raise exception 'Este presupuesto ya tiene pagos o ajustes: no se puede anular.'
      using errcode = 'PG003';
  end if;
  return new;
end;
$$;

create trigger presupuestos_reglas
  before insert or update on public.presupuestos
  for each row execute function public.presupuestos_reglas();

create function public.movimientos_pago_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  presupuesto record;
  saldo bigint;
begin
  new.motivo := nullif(trim(new.motivo), '');

  -- Bloquea el presupuesto: dos pagos a la vez no se pasan del saldo.
  select p.id, p.moneda, p.deleted_at into presupuesto
  from public.presupuestos p
  where p.id = new.presupuesto_id
  for update;
  if presupuesto.deleted_at is not null then
    raise exception 'Ese presupuesto está anulado.' using errcode = 'PG003';
  end if;
  new.moneda := presupuesto.moneda;

  saldo := public.saldo_presupuesto_centavos(new.presupuesto_id);
  if new.tipo = 'pago' and new.monto_centavos > saldo then
    raise exception 'El pago supera el saldo.' using errcode = 'PG001';
  end if;
  if new.tipo = 'ajuste' and saldo + new.monto_centavos < 0 then
    raise exception 'El ajuste dejaría el saldo negativo.' using errcode = 'PG002';
  end if;

  if new.tipo = 'pago' then
    insert into public.recibos_contador as c (organization_id, ultimo)
    values (new.organization_id, 1)
    on conflict (organization_id) do update set ultimo = c.ultimo + 1
    returning c.ultimo into new.numero_recibo;
  else
    new.numero_recibo := null;
  end if;

  if current_user = 'authenticated' then
    new.autor_id := auth.uid();
    new.profesional_id := public.profesional_del_usuario(new.organization_id);
    new.created_at := now();
    new.deleted_at := null;
    if new.fecha > (now() at time zone 'America/La_Paz')::date then
      raise exception 'La fecha no puede ser futura.' using errcode = 'PG005';
    end if;
  end if;
  return new;
end;
$$;

create trigger movimientos_pago_reglas
  before insert on public.movimientos_pago
  for each row execute function public.movimientos_pago_reglas();

-- ---------------------------------------------------------------------------
-- Permisos por fila (RLS)
-- ---------------------------------------------------------------------------

alter table public.presupuestos enable row level security;
alter table public.movimientos_pago enable row level security;
alter table public.recibos_contador enable row level security;

create policy "presupuestos: leer en mi organización" on public.presupuestos
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "presupuestos: crear en mi organización" on public.presupuestos
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "presupuestos: editar en mi organización" on public.presupuestos
  for update to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

create policy "movimientos_pago: leer en mi organización" on public.movimientos_pago
  for select to authenticated
  using (organization_id in (select public.org_ids_del_usuario()));

create policy "movimientos_pago: agregar en mi organización" on public.movimientos_pago
  for insert to authenticated
  with check (organization_id in (select public.org_ids_del_usuario()));

-- El contador lo usa el trigger, con los permisos de quien registra el pago.
create policy "recibos_contador: usar en mi organización" on public.recibos_contador
  for all to authenticated
  using (organization_id in (select public.org_ids_del_usuario()))
  with check (organization_id in (select public.org_ids_del_usuario()));

revoke delete, truncate on public.presupuestos from anon, authenticated;
-- Los movimientos solo se agregan (0003).
revoke update, delete, truncate on public.movimientos_pago from anon, authenticated;
revoke delete, truncate on public.recibos_contador from anon, authenticated;

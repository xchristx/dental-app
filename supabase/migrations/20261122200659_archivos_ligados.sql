-- La imagen de una Rx y el comprobante de un pago (decisión 0029). La tabla
-- `archivos` ya tenía rx_id y movimiento_id (0027); acá se agregan dos reglas:
-- solo un pago lleva comprobante (un ajuste no), y no se liga a algo anulado.

create or replace function public.archivos_reglas()
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

  if new.rx_id is not null then
    if not exists (
      select 1 from public.odontograma_rx x where x.id = new.rx_id and x.paciente_id = new.paciente_id
    ) then
      raise exception 'La Rx es de otro paciente.' using errcode = 'AR002';
    end if;
    if exists (select 1 from public.odontograma_rx x where x.id = new.rx_id and x.deleted_at is not null) then
      raise exception 'La Rx está anulada.' using errcode = 'AR005';
    end if;
  end if;

  if new.movimiento_id is not null then
    if not exists (
      select 1 from public.movimientos_pago m
      join public.presupuestos p on p.id = m.presupuesto_id
      where m.id = new.movimiento_id and p.paciente_id = new.paciente_id
    ) then
      raise exception 'El pago es de otro paciente.' using errcode = 'AR002';
    end if;
    if exists (
      select 1 from public.movimientos_pago m where m.id = new.movimiento_id and m.tipo <> 'pago'
    ) then
      raise exception 'Solo un pago lleva comprobante.' using errcode = 'AR004';
    end if;
    if exists (
      select 1 from public.movimientos_pago m
      where m.id = new.movimiento_id and m.deleted_at is not null
    ) then
      raise exception 'El pago está anulado.' using errcode = 'AR005';
    end if;
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

-- Para traer rápido la imagen de una Rx o el comprobante de un pago.
create index archivos_rx on public.archivos (rx_id) where rx_id is not null and deleted_at is null;
create index archivos_movimiento
  on public.archivos (movimiento_id) where movimiento_id is not null and deleted_at is null;

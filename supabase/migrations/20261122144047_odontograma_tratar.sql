-- Tratar o anular un hallazgo (decisión 0021): un registro realizado puede
-- resolver un hallazgo de la misma pieza. El vínculo es explícito.

alter table public.odontograma_registros
  add constraint odontograma_registros_organizacion_id_unico unique (organization_id, id),
  add column resuelve_id uuid,
  add constraint odontograma_registros_resuelve
    foreign key (organization_id, resuelve_id)
    references public.odontograma_registros (organization_id, id);

-- Un hallazgo se resuelve una sola vez (sin contar lo anulado).
create unique index odontograma_registros_resuelve_unico
  on public.odontograma_registros (resuelve_id)
  where deleted_at is null and resuelve_id is not null;

create function public.odontograma_registros_resolver()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tipo_nuevo text;
  resuelto record;
begin
  if new.resuelve_id is null then
    return new;
  end if;

  select c.tipo into tipo_nuevo from public.odontograma_codigos c where c.id = new.codigo_id;
  if tipo_nuevo is distinct from 'realizado' then
    raise exception 'Para marcar un hallazgo como tratado, elige algo realizado.' using errcode = 'OD004';
  end if;

  select r.paciente_id, r.pieza, r.deleted_at, c.tipo into resuelto
  from public.odontograma_registros r
  join public.odontograma_codigos c on c.id = r.codigo_id
  where r.id = new.resuelve_id;
  if resuelto.tipo is distinct from 'hallazgo'
    or resuelto.paciente_id is distinct from new.paciente_id
    or resuelto.pieza is distinct from new.pieza
    or resuelto.deleted_at is not null then
    raise exception 'Solo se trata un hallazgo vigente de la misma pieza.' using errcode = 'OD005';
  end if;
  return new;
end;
$$;

create trigger odontograma_registros_resolver
  before insert or update of resuelve_id, codigo_id, pieza on public.odontograma_registros
  for each row execute function public.odontograma_registros_resolver();

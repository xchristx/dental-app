-- Reagendar una cita (decisiones 0005 y 0012).
-- La original queda como cancelada o no_asistio y se crea una cita nueva que
-- apunta a ella. Las dos cosas pasan juntas o no pasa ninguna.

alter table public.citas
  add constraint citas_organizacion_id_unico unique (organization_id, id),
  -- La cita de la que viene esta, si se reagendó. Misma organización.
  add column reagendada_desde uuid,
  add constraint citas_reagendada_desde_fkey
    foreign key (organization_id, reagendada_desde)
    references public.citas (organization_id, id),
  add constraint citas_reagendada_desde_otra check (reagendada_desde <> id);

-- Una cita se reagenda una sola vez. Si la nueva tampoco sirve, se reagenda la nueva.
create unique index citas_reagendada_una_vez
  on public.citas (reagendada_desde)
  where reagendada_desde is not null and deleted_at is null;

-- security invoker: corre con los permisos de quien la llama, así que RLS
-- sigue impidiendo tocar citas de otra organización.
create function public.reagendar_cita(
  p_original uuid,
  p_estado_original text,
  p_id uuid,
  p_profesional uuid,
  p_lugar uuid,
  p_inicio timestamptz,
  p_fin timestamptz,
  p_tipo_cita uuid default null,
  p_nota text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  original public.citas%rowtype;
begin
  -- Reintento con el mismo id (por ejemplo, se tocó dos veces): ya está hecho (0003).
  if exists (
    select 1 from public.citas c
    where c.id = p_id and c.reagendada_desde = p_original and c.deleted_at is null
  ) then
    return p_id;
  end if;

  if p_estado_original not in ('cancelada', 'no_asistio') then
    raise exception 'La cita original solo puede quedar cancelada o no_asistio'
      using errcode = '22023';
  end if;

  select * into original
  from public.citas c
  where c.id = p_original and c.deleted_at is null
  for update;

  if not found then
    raise exception 'No existe la cita a reagendar' using errcode = 'P0002';
  end if;
  if original.paciente_id is null or original.estado = 'atendida' then
    raise exception 'Esta cita no se puede reagendar' using errcode = 'RE001';
  end if;
  if exists (
    select 1 from public.citas c
    where c.reagendada_desde = p_original and c.deleted_at is null
  ) then
    raise exception 'La cita ya se reagendó' using errcode = 'RE002';
  end if;

  -- Primero se libera el horario original: la nueva puede superponerse con él.
  if original.estado in ('agendada', 'confirmada') then
    update public.citas set estado = p_estado_original where id = p_original;
  end if;

  -- Si choca con otra cita, Postgres lanza 23P01 y se deshace todo.
  insert into public.citas (
    id, organization_id, profesional_id, lugar_id, paciente_id, tipo_cita_id,
    nota, inicio, fin, reagendada_desde
  ) values (
    p_id, original.organization_id, p_profesional, p_lugar, original.paciente_id, p_tipo_cita,
    p_nota, p_inicio, p_fin, p_original
  );

  return p_id;
end;
$$;

revoke execute on function public.reagendar_cita(uuid, text, uuid, uuid, uuid, timestamptz, timestamptz, uuid, text)
  from public, anon;
grant execute on function public.reagendar_cita(uuid, text, uuid, uuid, uuid, timestamptz, timestamptz, uuid, text)
  to authenticated;

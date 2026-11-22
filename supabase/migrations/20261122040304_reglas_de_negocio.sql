-- Reglas de negocio en la base (decisión 0017).
-- Hasta ahora las validaba el servidor de Next. Al pasar a una SPA, el
-- navegador habla directo con Supabase, así que las reglas viven aquí: valen
-- para la web, la app Android y cualquier otro cliente.
--
-- Los triggers se aplican a los usuarios de la app (rol `authenticated`). El
-- seed y las pruebas que preparan datos como `postgres` no pasan por ellos.
-- Los mensajes son los mismos de @dental/core: la app los muestra tal cual.

-- ---------------------------------------------------------------------------
-- Citas: estados, reglas de tiempo, llegada, recordatorio y extensión
-- (0005, 0012 y 0013)
-- ---------------------------------------------------------------------------

create function public.citas_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ahora constant timestamptz := now();
  zona constant text := 'America/La_Paz';
  es_bloqueo boolean;
  permitidos text[];
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- Una cita nueva siempre empieza agendada, sin llegada ni recordatorio.
  if tg_op = 'INSERT' then
    if new.estado <> 'agendada' or new.llegada_at is not null
      or new.recordatorio_enviado_at is not null or new.fin_previsto is not null then
      raise exception 'Una cita nueva empieza como agendada.' using errcode = 'RT010';
    end if;
    return new;
  end if;

  -- Cambio de estado: transiciones de la 0005 y reglas de tiempo de la 0013.
  -- Debe coincidir con estadosSiguientes y motivoPorHora de @dental/core.
  if new.estado is distinct from old.estado then
    es_bloqueo := new.paciente_id is null;
    permitidos := case
      when es_bloqueo and old.estado = 'agendada' then array['cancelada']
      when es_bloqueo and old.estado = 'cancelada' then array['agendada']
      when es_bloqueo then array[]::text[]
      when old.estado = 'agendada' then array['confirmada', 'atendida', 'no_asistio', 'cancelada']
      when old.estado = 'confirmada' then array['agendada', 'atendida', 'no_asistio', 'cancelada']
      else array['agendada']
    end;
    if not new.estado = any (permitidos) then
      raise exception 'La cita ya cambió. Recarga la página.' using errcode = 'RT001';
    end if;

    if new.estado = 'confirmada' and ahora >= old.inicio then
      raise exception 'La cita ya empezó: ya no hace falta confirmarla.' using errcode = 'RT002';
    end if;
    if new.estado = 'atendida'
      and (ahora at time zone zona)::date < (old.inicio at time zone zona)::date then
      raise exception 'Todavía no es el día de la cita.' using errcode = 'RT003';
    end if;
    if new.estado = 'no_asistio' and ahora < old.inicio then
      raise exception 'La cita todavía no empieza.' using errcode = 'RT004';
    end if;

    -- Reactivar una cita ya reagendada dejaría al paciente con dos citas (0012).
    if new.estado = 'agendada' and exists (
      select 1 from public.citas c
      where c.reagendada_desde = new.id and c.deleted_at is null
    ) then
      raise exception 'Esta cita ya se reagendó. Si hace falta, cambia o cancela la cita nueva.'
        using errcode = 'RT005';
    end if;

    -- "Llegó" guarda la hora de la base, no la del dispositivo.
    if new.estado = 'atendida' and new.llegada_at is null then
      new.llegada_at := ahora;
    end if;
  end if;

  -- La hora de llegada solo existe en una cita atendida y no puede ser futura.
  -- Un minuto de tolerancia por la diferencia de reloj con el dispositivo.
  if new.llegada_at is distinct from old.llegada_at and new.llegada_at is not null then
    if new.estado <> 'atendida' then
      raise exception 'Primero marca que llegó.' using errcode = 'RT006';
    end if;
    if new.llegada_at > ahora + interval '1 minute' then
      raise exception 'La hora de llegada no puede ser más tarde que ahora.' using errcode = 'RT007';
    end if;
  end if;

  -- El recordatorio tiene sentido mientras la cita está activa y no empezó.
  if new.recordatorio_enviado_at is distinct from old.recordatorio_enviado_at
    and new.recordatorio_enviado_at is not null then
    if old.estado not in ('agendada', 'confirmada') or ahora >= old.inicio then
      raise exception 'Esta cita ya empezó o no está activa.' using errcode = 'RT008';
    end if;
    new.recordatorio_enviado_at := ahora;
  end if;

  -- Extender por llegada tarde: como mucho, la duración acordada contada desde
  -- que llegó (finSiSeAtiendeCompleta de @dental/core).
  if new.fin is distinct from old.fin and new.fin_previsto is not null then
    if new.estado <> 'atendida' or new.llegada_at is null then
      raise exception 'Primero marca que llegó.' using errcode = 'RT006';
    end if;
    if new.fin > greatest(new.llegada_at, new.inicio) + (new.fin_previsto - new.inicio) then
      raise exception 'No se puede extender más que la duración acordada desde la llegada.'
        using errcode = 'RT009';
    end if;
  end if;

  return new;
end;
$$;

create trigger citas_reglas
  before insert or update on public.citas
  for each row execute function public.citas_reglas();

-- ---------------------------------------------------------------------------
-- Reagendar: la cita nueva no puede empezar en el pasado (0013)
-- ---------------------------------------------------------------------------

create or replace function public.reagendar_cita(
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

  if p_inicio <= now() then
    raise exception 'Elige un horario que todavía no haya pasado.' using errcode = 'RT011';
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

-- ---------------------------------------------------------------------------
-- Pacientes: la fecha de nacimiento no puede ser futura (0013)
-- ---------------------------------------------------------------------------

create function public.pacientes_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
    and new.fecha_nacimiento > (now() at time zone 'America/La_Paz')::date then
    raise exception 'La fecha de nacimiento no puede ser futura.' using errcode = 'PA001';
  end if;
  return new;
end;
$$;

create trigger pacientes_reglas
  before insert or update of fecha_nacimiento on public.pacientes
  for each row execute function public.pacientes_reglas();

-- ---------------------------------------------------------------------------
-- Horarios: dos tramos vigentes de la misma profesional no se superponen
-- el mismo día (0004). Se compara la hora sobre una fecha fija y la vigencia
-- como rango de fechas (sin vigente_hasta, sigue vigente).
-- ---------------------------------------------------------------------------

alter table public.horarios
  add constraint horarios_sin_superposicion exclude using gist (
    profesional_id with =,
    dia_semana with =,
    tsrange(date '2000-01-01' + hora_inicio, date '2000-01-01' + hora_fin, '[)') with &&,
    daterange(vigente_desde, vigente_hasta, '[]') with &&
  ) where (deleted_at is null);

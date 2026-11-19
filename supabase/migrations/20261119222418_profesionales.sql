-- Gestión de profesionales y permisos por rol (0014).
-- La admin (la dentista) agrega, edita y da de baja profesionales y carga
-- horarios de cualquiera. Una profesional con rol `profesional` (una socia con
-- usuario) solo edita sus propios datos y horarios.

-- ---------------------------------------------------------------------------
-- Funciones de ayuda para las políticas. security definer para leer miembros
-- sin depender de su propia política (igual que org_ids_del_usuario).
-- ---------------------------------------------------------------------------

create function public.es_admin_de(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.user_id = (select auth.uid())
      and m.organization_id = org
      and m.rol = 'admin'
      and m.deleted_at is null
  )
$$;

create function public.profesional_del_usuario(org uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.profesional_id from public.miembros m
  where m.user_id = (select auth.uid())
    and m.organization_id = org
    and m.deleted_at is null
  limit 1
$$;

revoke execute on function public.es_admin_de(uuid) from public, anon;
revoke execute on function public.profesional_del_usuario(uuid) from public, anon;
grant execute on function public.es_admin_de(uuid) to authenticated;
grant execute on function public.profesional_del_usuario(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Profesionales: crear solo la admin; editar la admin o la propia profesional.
-- La propia profesional no puede darse de baja.
-- ---------------------------------------------------------------------------

drop policy "profesionales: crear en mi organización" on public.profesionales;
drop policy "profesionales: editar en mi organización" on public.profesionales;

create policy "profesionales: crear si soy admin" on public.profesionales
  for insert to authenticated
  with check (public.es_admin_de(organization_id));

create policy "profesionales: editar si soy admin o soy yo" on public.profesionales
  for update to authenticated
  using (
    public.es_admin_de(organization_id)
    or id = public.profesional_del_usuario(organization_id)
  )
  with check (
    public.es_admin_de(organization_id)
    or (id = public.profesional_del_usuario(organization_id) and deleted_at is null)
  );

-- ---------------------------------------------------------------------------
-- Horarios: la admin carga los de cualquiera; cada profesional, los suyos.
-- ---------------------------------------------------------------------------

drop policy "horarios: crear en mi organización" on public.horarios;
drop policy "horarios: editar en mi organización" on public.horarios;

create policy "horarios: crear si soy admin o son míos" on public.horarios
  for insert to authenticated
  with check (
    public.es_admin_de(organization_id)
    or profesional_id = public.profesional_del_usuario(organization_id)
  );

create policy "horarios: editar si soy admin o son míos" on public.horarios
  for update to authenticated
  using (
    public.es_admin_de(organization_id)
    or profesional_id = public.profesional_del_usuario(organization_id)
  )
  with check (
    public.es_admin_de(organization_id)
    or profesional_id = public.profesional_del_usuario(organization_id)
  );

-- ---------------------------------------------------------------------------
-- Dar de baja (borrado suave) a una profesional. No se puede si tiene un
-- usuario (primero se le quita el acceso) o citas pendientes (primero se
-- reagendan o cancelan). Sus citas pasadas quedan como historial.
-- security definer: tiene que ver todas las citas y miembros, no solo las
-- que deja ver RLS.
-- ---------------------------------------------------------------------------

create function public.profesionales_validar_baja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    if exists (
      select 1 from public.miembros m
      where m.profesional_id = old.id and m.deleted_at is null
    ) then
      raise exception 'La profesional tiene un usuario' using errcode = 'PR001';
    end if;
    if exists (
      select 1 from public.citas c
      where c.profesional_id = old.id
        and c.deleted_at is null
        and c.estado in ('agendada', 'confirmada')
        and c.fin > now()
    ) then
      raise exception 'La profesional tiene citas pendientes' using errcode = 'PR002';
    end if;
  end if;
  return new;
end;
$$;

create trigger profesionales_validar_baja
  before update of deleted_at on public.profesionales
  for each row execute function public.profesionales_validar_baja();

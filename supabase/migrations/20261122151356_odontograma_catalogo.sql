-- Editar el catálogo del odontograma (decisión 0022). Los permisos ya estaban
-- desde la 0020: lo ven todas y lo cambia la administradora.

-- Un código ya usado no cambia de tipo, ni de "por caras", ni de "con grado":
-- los registros se cargaron con esas reglas. Se da de baja y se crea otro.
create function public.odontograma_codigos_reglas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.abreviatura := trim(new.abreviatura);
  new.nombre := trim(new.nombre);
  if tg_op = 'INSERT' then
    return new;
  end if;

  new.organization_id := old.organization_id;
  new.created_at := old.created_at;
  if (new.tipo, new.por_caras, new.usa_grado) is distinct from (old.tipo, old.por_caras, old.usa_grado)
    and exists (
      select 1 from public.odontograma_registros r
      where r.codigo_id = old.id and r.deleted_at is null
    ) then
    raise exception 'Este código ya se usó: no se puede cambiar si es hallazgo o realizado, si va por caras ni si lleva grado.'
      using errcode = 'OD006';
  end if;
  return new;
end;
$$;

create trigger odontograma_codigos_reglas
  before insert or update on public.odontograma_codigos
  for each row execute function public.odontograma_codigos_reglas();

-- Los códigos con registros vigentes, para avisar en Ajustes qué ya no se
-- puede cambiar. Con los permisos de quien llama: solo ve su organización.
create function public.odontograma_codigos_usados()
returns setof uuid
language sql
stable
set search_path = ''
as $$
  select distinct r.codigo_id from public.odontograma_registros r
  where r.deleted_at is null and r.codigo_id is not null
$$;

-- Un código dado de baja no se usa para registros nuevos. Los que ya lo usan
-- se siguen viendo (y se pueden anular).
create function public.odontograma_registros_codigo_en_uso()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo_id is not null and exists (
    select 1 from public.odontograma_codigos c
    where c.id = new.codigo_id and c.deleted_at is not null
  ) then
    raise exception 'Ese código ya no se usa. Elige otro.' using errcode = 'OD007';
  end if;
  return new;
end;
$$;

create trigger odontograma_registros_codigo_en_uso
  before insert or update of codigo_id on public.odontograma_registros
  for each row execute function public.odontograma_registros_codigo_en_uso();

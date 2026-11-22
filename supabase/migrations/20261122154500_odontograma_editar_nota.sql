-- Editar la nota de un registro del odontograma (decisión 0025): solo quien
-- lo cargó y solo el mismo día (La Paz), como la evolución (0018).

create function public.odontograma_registros_editar_nota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' and new.nota is distinct from old.nota then
    if old.autor_id is distinct from auth.uid() then
      raise exception 'Solo quien cargó el registro puede cambiar su nota.' using errcode = 'OD008';
    end if;
    if (old.created_at at time zone 'America/La_Paz')::date
       <> (now() at time zone 'America/La_Paz')::date then
      raise exception 'La nota solo se corrige el mismo día. Agrega una nota nueva para aclararla.'
        using errcode = 'OD009';
    end if;
  end if;
  return new;
end;
$$;

create trigger odontograma_registros_editar_nota
  before update of nota on public.odontograma_registros
  for each row execute function public.odontograma_registros_editar_nota();

#!/usr/bin/env bash
# Prueba de restauración (decisiones 0011 y 0031): una vez al mes se restaura
# un respaldo de producción en el Supabase local. Un respaldo que nunca se
# restauró no está comprobado.
#
# Uso, desde la raíz del repo, con el Supabase local levantado:
#   scripts/probar-respaldo.sh base-AAAA-MM-DD.tar.gz.age ruta/a/clave-privada.txt
#
# BORRA la base local y carga datos REALES de pacientes. Al terminar, correr
# `pnpm db:reset` para dejar otra vez los datos inventados.
set -euo pipefail

archivo=${1:?Uso: scripts/probar-respaldo.sh base-AAAA-MM-DD.tar.gz.age clave-privada.txt}
clave=${2:?Falta la clave privada de age.}
contenedor=supabase_db_dental-app

dir=$(mktemp -d)
trap 'rm -rf "$dir"' EXIT

age -d -i "$clave" < "$archivo" | tar -xz -C "$dir"
for f in datos.sql esquema.sql migracion.txt; do
  [ -s "$dir/$f" ] || { echo "El respaldo no tiene $f." >&2; exit 1; }
done

respaldo=$(tr -d '[:space:]' < "$dir/migracion.txt")
local_=$(ls supabase/migrations | sort | tail -1 | cut -d_ -f1)
echo "Respaldo hecho con la migración $respaldo. Este checkout llega a $local_."
if [ "$respaldo" != "$local_" ]; then
  echo "Para restaurar con el mismo esquema, haz checkout del commit con la migración $respaldo."
fi

if [ "${SIN_PREGUNTAR:-}" != "1" ]; then
  read -r -p "Esto BORRA la base local y carga datos reales. ¿Seguir? (s/N) " respuesta
  [ "$respuesta" = "s" ] || { echo "No se hizo nada."; exit 1; }
fi

pnpm exec supabase db reset --no-seed
# Como supabase_admin: postgres no puede escribir en algunas tablas internas de
# Storage. replica: los triggers no corren (los datos ya pasaron por ellos).
{ echo 'set session_replication_role = replica;'; cat "$dir/datos.sql"; } \
  | docker exec -i "$contenedor" psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -1 -q > /dev/null

docker exec "$contenedor" psql -U postgres -c "
  select 'organizaciones' as tabla, count(*) from public.organizaciones
  union all select 'usuarios', count(*) from auth.users
  union all select 'pacientes', count(*) from public.pacientes
  union all select 'citas', count(*) from public.citas
  union all select 'movimientos de pago', count(*) from public.movimientos_pago
  union all select 'archivos', count(*) from public.archivos"

echo
echo "Restaurado. Revisa en la app local que se vean la agenda, un paciente y sus pagos."
echo "Al terminar: pnpm db:reset (borra los datos reales de tu computadora)."

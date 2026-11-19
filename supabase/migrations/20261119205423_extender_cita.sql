-- Extender una cita cuando el paciente llega tarde (0013).
-- `fin` es siempre lo que ocupa la agenda y lo que miran los choques.
-- `fin_previsto` guarda el fin acordado con el paciente, solo si se extendió.
alter table public.citas
  add column fin_previsto timestamptz,
  add constraint citas_fin_previsto_antes_del_fin
    check (fin_previsto is null or (fin_previsto > inicio and fin_previsto <= fin));

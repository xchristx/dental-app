# 0002: Profesionales, lugares y sillones

- **Fecha:** 2026-11-19
- **Estado:** aceptada

## Contexto

La dentista trabaja en su consultorio, en una clínica y a veces en el consultorio de sus socias. Las socias también atienden en el consultorio de ella.

Los consultorios tienen un solo sillón. En la clínica hay varios, pero se los asignan.

## Decisión

- **Profesionales y lugares son entidades independientes.** Una cita es: profesional + lugar + paciente (opcional) + rango de tiempo.
- Cada lugar indica si **controla el sillón** (`controla_sillon`):
  - Consultorios: sí, con un solo sillón.
  - Clínica: no, porque el sillón lo asigna la clínica.
- Postgres impide los choques con restricciones de exclusión sobre `tstzrange`:
  1. La misma profesional no puede tener citas superpuestas.
  2. El mismo lugar con `controla_sillon = true` no puede tener citas superpuestas.
- Las citas canceladas no cuentan para los choques.
- Se puede registrar una cita sin paciente (un bloqueo), como "ocupada en la clínica".
- Todo pertenece a una **organización** (`organization_id`), lo que permite tener varios consultorios.
  - La v1 tiene una sola organización y una sola usuaria.
  - Las socias pueden aparecer como profesionales aunque todavía no tengan usuario.

## Consecuencias

- Cuando una socia use el consultorio de la dentista, la app avisa del choque aunque la socia todavía no use la app.
- Más adelante dar acceso a las socias es agregar usuarios, no cambiar el modelo.

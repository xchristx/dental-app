# Dental App

App de gestión para consultorios odontológicos: agenda en varios lugares, historia clínica con odontograma, y pagos en cuotas.

Se construye con una dentista real que hoy lleva todo en papel.

**Estado:** MVP 1 (agenda) completo: inicio de sesión, agenda (día en el celular, semana desde tablet), agendar con horarios libres y avisos, detalle de cita con estado, llegada, recordatorio por WhatsApp, reagendar y aviso de llegada tarde, pacientes y ajustes de lugares, profesionales y horarios. MVP 2 (historia clínica) completo: anamnesis con alergias destacadas, evolución por cita, derivaciones, examen bucal y odontograma (tabla y gráfico, con CPO-D y ceo-d, columna Rx, línea de tiempo y catálogo de códigos editable). MVP 3 (pagos y archivos) completo: presupuestos y planilla de pagos, recibo en PDF por WhatsApp, radiografías y fotos por paciente, la imagen de cada Rx y el comprobante de cada pago. Producción (decisiones 0030 y 0031): se entra con Google, se publica a mano después de un respaldo, y hay respaldos diarios cifrados en Google Drive. Ver la [guía de producción](docs/operacion/produccion.md).

**Demo:** <https://sifel-demo.netlify.app> (datos inventados, se reinicia cada día). En Android se puede instalar desde el menú del navegador: "Instalar app" o "Agregar a la pantalla de inicio".

## Desarrollo

Requisitos: Node 24, pnpm (`corepack enable pnpm`), Docker y la CLI de Supabase.

```sh
pnpm install
pnpm db:start   # Supabase local, con datos inventados
cp apps/web/.env.example apps/web/.env.local
# Completar VITE_SUPABASE_PUBLISHABLE_KEY con la de `supabase status`
pnpm dev        # web en http://localhost:5173
```

En local, "Entrar como demo" usa la usuaria `demo@ejemplo.test` del seed.

Tests: `pnpm test` (packages/core), `pnpm db:test` (pgTAP) y `pnpm test:e2e` (Playwright, de punta a punta).

Las pruebas de punta a punta necesitan el Supabase local levantado y Chrome instalado. Compilan la web y la sirven con `vite preview` en el puerto 4173, o usan el servidor que ya esté en ese puerto. Cada archivo de `apps/web/e2e/` reinicia la base local con el seed, así que no corren contra otra base. Las fechas se calculan desde hoy: el resultado no depende del día en que se corren.

## Documentación

- [Descubrimiento](docs/descubrimiento.md): cómo trabaja hoy la dentista y qué le complica.
- [Alcance y etapas](docs/alcance.md)
- [Preguntas pendientes](docs/preguntas-pendientes.md)
- Decisiones:
  - [0001: Stack](docs/decisiones/0001-stack.md)
  - [0002: Lugares y sillones](docs/decisiones/0002-lugares-y-sillones.md)
  - [0003: Preparado para funcionar sin conexión](docs/decisiones/0003-preparado-para-offline.md)
  - [0004: Horarios, huecos libres y traslados](docs/decisiones/0004-horarios-y-huecos-libres.md)
  - [0005: Estados de la cita y hora de llegada](docs/decisiones/0005-estados-de-cita.md)
  - [0006: Ambientes, respaldos, despliegue y tests](docs/decisiones/0006-ambientes-respaldos-y-despliegue.md)
  - [0007: Autenticación y membresías](docs/decisiones/0007-autenticacion.md)
  - [0008: Diseño e interfaz](docs/decisiones/0008-diseno-e-interfaz.md)
  - [0009: Interfaz en celular y escritorio](docs/decisiones/0009-interfaz-en-celular-y-escritorio.md)
  - [0010: Hosting de la web en Netlify](docs/decisiones/0010-hosting-netlify.md)
  - [0011: Producción en el plan gratis de Supabase](docs/decisiones/0011-produccion-en-plan-gratis.md)
  - [0012: Reagendar una cita](docs/decisiones/0012-reagendar.md)
  - [0013: Reglas de tiempo de una cita y llegada tarde](docs/decisiones/0013-reglas-de-tiempo-y-llegada-tarde.md)
  - [0014: Gestión de profesionales y permisos por rol](docs/decisiones/0014-gestion-de-profesionales.md)
  - [0015: La demo se reinicia cada día](docs/decisiones/0015-demo-se-reinicia-cada-dia.md)
  - [0016: Supabase en São Paulo](docs/decisiones/0016-region-de-supabase.md)
  - [0017: La web pasa a ser una SPA con Vite](docs/decisiones/0017-spa-con-vite.md)
  - [0018: Historia clínica, primera parte: anamnesis y evolución](docs/decisiones/0018-anamnesis-y-evolucion.md)
  - [0019: Derivaciones](docs/decisiones/0019-derivaciones.md)
  - [0020: Odontograma con las normas generales](docs/decisiones/0020-odontograma.md)
  - [0021: Tratar o anular un hallazgo, y el plan de tratamiento](docs/decisiones/0021-tratar-o-anular-hallazgos.md)
  - [0022: Editar el catálogo del odontograma](docs/decisiones/0022-editar-el-catalogo-del-odontograma.md)
  - [0023: Radiografías en el odontograma (columna Rx)](docs/decisiones/0023-radiografias-en-el-odontograma.md)
  - [0024: Examen bucal (datos generales de la ficha)](docs/decisiones/0024-examen-bucal.md)
  - [0025: Editar la nota de un registro del odontograma](docs/decisiones/0025-editar-la-nota-de-un-registro.md)
  - [0026: Presupuestos y libro de pagos](docs/decisiones/0026-presupuestos-y-libro-de-pagos.md)
  - [0027: Archivos de pacientes (radiografías y fotos)](docs/decisiones/0027-archivos-de-pacientes.md)
  - [0028: Recibo por WhatsApp, sin firma](docs/decisiones/0028-recibo-por-whatsapp.md)
  - [0029: La imagen de cada Rx y el comprobante de cada pago](docs/decisiones/0029-imagen-de-la-rx-y-comprobante-del-pago.md)
  - [0030: Producción: proyecto, sitio, cuentas y cómo se publica](docs/decisiones/0030-produccion.md)
  - [0031: Respaldos cifrados en Google Drive](docs/decisiones/0031-respaldos-en-google-drive.md)
- [Guía de producción](docs/operacion/produccion.md): armarla, publicar y probar un respaldo cada mes.
- [Guía de diseño](docs/diseno.md)

## Stack

TypeScript · pnpm + Turborepo · Vite + TanStack Router y Query · Tailwind v4 + shadcn/ui · Phosphor · Supabase (Postgres) · Zod · Vitest + pgTAP + Playwright · Netlify (sitio estático) · Expo + PowerSync (fase 2)

## Estructura

```
apps/web        SPA con Vite (fase 1)
apps/mobile     Expo Android, sin conexión (fase 2, todavía no existe)
packages/core   lógica compartida: saldos, choques de agenda, odontograma
supabase/       migraciones y datos de prueba
docs/           descubrimiento, alcance y decisiones
```

## Privacidad

Este repositorio nunca guarda datos de pacientes reales. Las demos y los datos de prueba se generan con datos inventados.

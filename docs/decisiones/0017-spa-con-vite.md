# 0017: La web pasa a ser una SPA con Vite

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Reemplaza:**
  - De la 0001, que la web se hace con Next.js.
  - De la 0010, que Netlify despliega Next con su adaptador. La web sigue en Netlify, pero como sitio estático.
- **Completa:** la [0003](0003-preparado-para-offline.md) (sin conexión) y la [0013](0013-reglas-de-tiempo-y-llegada-tarde.md), cuyas reglas pasan a Postgres.

## Contexto

La web se hizo con Next.js 16: componentes de servidor, server actions y un `proxy` que revisa la sesión. Con la app en uso, aparecieron problemas que vienen de tener un servidor en el medio:

- **Arranque en frío.** Las páginas y las acciones corren en funciones de Netlify, que se duermen cuando nadie las usa. Medido el 2026-11-21 contra `sifel.netlify.app`: el primer byte llega en ~0,6 s con la función despierta y en 4,7 s después de 12 minutos sin uso. Mantenerla despierta con una tarea programada gasta créditos del plan gratis de Netlify, y si se acaban, el sitio se suspende hasta fin de mes.
- **Mezcla de versiones al desplegar.** Una pestaña abierta antes de un despliegue cargaba el JavaScript nuevo con el CSS viejo (#22).
- **Un salto de más.** Cada consulta va del navegador a la función (Ohio) y de ahí a Supabase (Oregón). El `proxy` revisa la sesión en cada pedido, incluidas las precargas.
- **Complejidad propia del router.** Precargas que vencen (`staleTimes`), páginas anteriores que quedan ocultas en el DOM y navegaciones que no muestran nada hasta que responde el servidor (#21). Para que cambiar de día fuera instantáneo hubo que esquivar el router con `history.pushState` (#18).

Lo que Next aporta no se aprovecha aquí:

- La app está detrás de un login: no necesita SEO ni una primera carga sin JavaScript.
- La app Android (fase 2) no puede usar las server actions. Lo que validan hay que llevarlo de todos modos a `@dental/core` o a Postgres.
- Renderizar en el servidor va en contra de funcionar sin conexión (0003). La 0012 ya anota que reagendar no anda sin red.

Las server actions son, casi todas, llamadas a Supabase con validaciones de `@dental/core`: el mismo código corre en el navegador. Lo que no se puede mover tal cual son las reglas que hoy se cumplen porque el servidor es de confianza (las de tiempo de la 0013, por ejemplo). En el navegador, alguien con sesión podría saltearlas.

## Decisión

### La web

- **Vite + React + TypeScript**, como SPA estática.
- **TanStack Router** para las rutas: los parámetros de la URL (`?fecha=`, `?cita=`) se validan y tienen tipos.
- **TanStack Query** para los datos: caché, reintentos y volver a pedir lo que cambió después de guardar.
- **Supabase desde el navegador** con `supabase-js`, que guarda y renueva la sesión. RLS sigue siendo lo que protege los datos.
- **Sin cambios:** Tailwind v4 (con `@tailwindcss/vite`), shadcn/ui, Phosphor, los tokens de `docs/diseno.md`, `@dental/core` y el esquema de Postgres.
- **Fuentes:** Fontsource en lugar de `next/font`.
- **Netlify** publica la carpeta `dist` como sitio estático, con una redirección `/* → /index.html` para las rutas. Sin funciones de servidor.
- **Variables:** pasan de `NEXT_PUBLIC_*` a `VITE_*`. "Entrar como demo" lee la cuenta demo de `VITE_DEMO_EMAIL` y `VITE_DEMO_PASSWORD`. Esa cuenta ya es pública (`supabase/seed.sql`) y solo existe en la demo. En producción esas variables van vacías.

### Las reglas de negocio pasan a Postgres

Lo que hoy valida el servidor de Next pasa a la base, para que valga desde la web, la app Android o cualquier otro cliente:

- **Citas** (trigger antes de actualizar):
  - las transiciones de estado de la 0005 y las reglas de tiempo de la 0013: "Confirmó" antes de la hora, "Llegó" desde el mismo día, "No asistió" desde la hora;
  - "Llegó" guarda la hora de la base, y una llegada corregida no puede ser posterior a ahora;
  - el recordatorio se marca solo antes de la cita, si está agendada o confirmada;
  - una extensión por llegada tarde no pasa de la duración acordada contada desde la llegada;
  - una cita ya reagendada no se reactiva.
- **Reagendar:** `reagendar_cita` rechaza un horario que ya pasó.
- **Pacientes:** la fecha de nacimiento no puede ser futura.
- **Horarios:** dos tramos de la misma profesional no se superponen.

Las reglas valen para los usuarios de la app (rol `authenticated`). El seed y las pruebas que preparan datos como `postgres` no pasan por ellas. Se prueban con pgTAP.

`@dental/core` sigue validando en el navegador, para mostrar solo los botones que valen y explicar un error antes de guardar. La palabra final la tiene la base, igual que con los choques (0002).

### Cómo se migra

Cada paso es un PR, y la demo funciona durante toda la migración:

1. **Reglas en Postgres.** Funcionan también con la web de Next, que ya valida lo mismo.
2. **App nueva en paralelo** en `apps/web-vite`, pantalla por pantalla. Las pruebas de Playwright corren contra las dos apps (cambiando `E2E_URL`), y la nueva está lista cuando pasan todas.
3. **Cambio.** Netlify pasa a publicar la app nueva y se borra la de Next; `apps/web-vite` pasa a ser `apps/web`. Se actualizan el CI, el README y las convenciones de Next en `CLAUDE.md`. El último commit con Next queda marcado con la etiqueta `version-next`.

### Región de Supabase

El borrador de la 0016 elige Ohio porque ahí corren las funciones de Netlify, que hoy son las que consultan la base. Sin funciones, el navegador habla directo con Supabase, así que conviene la región más cercana a Bolivia. La 0016 se revisa antes de mover la demo.

## Alternativas

- **Seguir con Next y mantener la función despierta:** gasta créditos aunque nadie use la app, y no resuelve la mezcla de versiones ni el funcionamiento sin conexión.
- **Next en Vercel:** menos arranques en frío, pero el plan gratis no permite uso comercial (0010).
- **Next con export estático (`output: 'export'`):** queda una SPA, pero sin server actions ni `proxy`, y con un router pensado para tener servidor.
- **React Router en modo SPA:** también sirve. Se elige TanStack Router por los parámetros de búsqueda con tipos y por cómo se integra con TanStack Query.

## Consecuencias

- Sin funciones de servidor: sin arranque en frío, sin créditos de cómputo y sin mezcla de versiones con el CSS.
- La primera visita descarga el JavaScript de la app; las siguientes lo toman de la caché del navegador.
- La sesión vive en el navegador y la renueva `supabase-js`. Ya no hay `proxy`: la redirección a "Entrar" la hace el router.
- Las reglas de negocio quedan en un solo lugar que vale para todos los clientes. Es lo que necesita la app Android.
- Las pruebas de Playwright no dependen de Next: sirven de pruebas de aceptación durante la migración y después.
- Más adelante, un service worker puede hacer que la app abra sin conexión (0003).

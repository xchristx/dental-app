# 0015: La demo se reinicia cada día

- **Fecha:** 2026-11-21
- **Estado:** aceptada
- **Completa:** la [0006](0006-ambientes-respaldos-y-despliegue.md) (ambientes) y la [0011](0011-produccion-en-plan-gratis.md) (que el plan gratis no se pause).

## Contexto

La demo (`sifel.netlify.app`, proyecto `dental-app-demo` de Supabase) se cargó con el seed, que ubica las citas en la semana en que se carga. Una semana después, la agenda de la demo aparece vacía, tanto para la dentista como para quien vea el portafolio.

Además, cualquiera puede entrar con el botón "Entrar como demo" y cambiar los datos. Y un proyecto gratis de Supabase se pausa después de una semana sin uso.

## Decisión

- Un workflow de GitHub Actions (`.github/workflows/reiniciar-demo.yml`) **reinicia la base de la demo todos los días a las 04:00 de La Paz**. Aplica las migraciones y el seed con `supabase db reset --remote`. También se puede correr a mano desde la pestaña Actions.
- Se conecta con el secreto `DEMO_DB_URL`, la cadena del "Session pooler" de `dental-app-demo`. Se usa el pooler porque los runners de GitHub no tienen IPv6, y la conexión directa de Supabase lo necesita.
- **Nunca toca producción.** Antes de reiniciar, el workflow comprueba que el secreto apunte al proyecto de la demo; si no, se detiene sin hacer nada. Producción no tiene seed ni reinicios (0011).
- Después del reinicio comprueba que `sifel.netlify.app/entrar` responda.

## Consecuencias

- La demo siempre muestra citas de la semana actual, y lo que cambien las visitas se borra cada día.
- La actividad diaria evita que el proyecto de la demo se pause.
- Durante el reinicio, menos de un minuto de madrugada, la demo no responde.
- Los sábados y domingos, las citas de la demo ya pasaron: muestran "Llegó" y "No asistió". Para ver citas pendientes hay que ir a la semana siguiente o agendar una nueva.
- GitHub desactiva los workflows programados si el repositorio pasa 60 días sin actividad. Si eso pasa, se reactiva desde la pestaña Actions.

# 0011: Producción en el plan gratis de Supabase

- **Fecha:** 2026-11-19
- **Estado:** aceptada. La región y la organización aparte para producción las reemplaza la [0016](0016-region-de-supabase.md).
- **Reemplaza:**
  - De la 0001, la región: "el servidor va en São Paulo".
  - De la 0006, que producción pasa al plan Pro antes del primer paciente real.

## Contexto
Lo más probable es que producción quede en el plan gratis de Supabase. Ese plan cambia tres cosas que la 0001 y la 0006 daban por hechas:

- **Región:** al crear un proyecto gratis solo se elige el continente ("Americas"), no la región exacta. São Paulo no está garantizado.
- **Respaldos:** los respaldos diarios eran el motivo principal para pasar a Pro. Perder la base de una dentista que dejó el papel sería grave (0006).
- **Pausa:** un proyecto gratis se pausa después de una semana sin uso. Si ella se va de vacaciones, al volver la app no responde hasta reactivarlo.

Además, cada cuenta tiene un máximo de 2 proyectos gratis activos.

## Decisión

### Producción en el plan gratis, en una organización aparte
- Producción va en una **organización de Supabase nueva**, separada de la de la demo y de otros proyectos. Así no compite por el límite de 2 proyectos activos, y si algún día pasa a Pro no se paga por la demo.
- **Región:** la que asigne "Americas". Para Bolivia conviene la costa este de Estados Unidos o São Paulo, más que la costa oeste. Si se puede elegir, se prefiere la misma región que las funciones de Netlify, porque la web consulta la base desde ahí.

### Respaldos propios (obligatorio antes del primer paciente real)
Como el plan gratis no da respaldos que podamos descargar, los hacemos nosotros:
- Un respaldo diario con `pg_dump`, programado.
- **Cifrado antes de salir del servidor que lo genera**, con una clave pública. La clave privada la guardan solo el autor y la dentista.
- Guardado **fuera de Supabase** y nunca en este repositorio, que es público.
- Se guardan al menos los últimos 30 días.
- **Una vez al mes se prueba restaurar** un respaldo en el Supabase local. Un respaldo que nunca se restauró no está comprobado.

El detalle de dónde corre y dónde se guarda se decide al implementarlo, en una decisión aparte.

### Que no se pause
- Una tarea programada hace una consulta liviana todos los días, para que el proyecto no cuente como inactivo.
- Además, si la app no logra conectarse con la base, muestra un mensaje claro ("La base de datos está en pausa") en vez de un error genérico.

### Cuándo revisar esta decisión
Pasar a Pro si pasa cualquiera de estas cosas:
- La base se acerca al límite de tamaño del plan gratis.
- Los archivos (radiografías y fotos del MVP 3) se acercan al límite de almacenamiento.
- Los respaldos propios fallan o dan más trabajo del que ahorran.
- La dentista prefiere pagar por la tranquilidad.

Revisar los límites y precios de cada plan en ese momento, porque cambian.

## Consecuencias
- No hay costo mensual fijo de Supabase.
- Hay más trabajo propio: respaldos, pruebas de restauración y la tarea contra la pausa. Todo tiene que estar funcionando **antes** de cargar el primer paciente real.
- La latencia desde Bolivia puede ser algo mayor que con São Paulo. Para una agenda de una sola usuaria no debería notarse.

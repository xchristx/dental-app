# 0016: Supabase en São Paulo, la región con menos latencia desde Bolivia

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Reemplaza:**
  - De la 0011, la región ("la que asigne 'Americas'", y preferir la de las funciones de Netlify) y la idea de que en el plan gratis no se puede elegir la región exacta.
  - De la 0011, que una organización aparte evita competir por el límite de 2 proyectos gratis activos.
- **Depende de:** la [0017](0017-spa-con-vite.md). Sin funciones de servidor, la región solo tiene que estar cerca de quien usa la app.

## Contexto

Con la SPA (0017), cada consulta sale del navegador y va directo a Supabase. No hay funciones de Netlify en el medio, así que ya no hay que poner la base junto a ellas. Lo que cuenta es el viaje de ida y vuelta entre el celular de la dentista, en Bolivia, y la región de Supabase. Ese viaje se paga en cada consulta, y las que van una después de otra lo suman: entrar, abrir la agenda, guardar una cita.

Al crear un proyecto gratis, Supabase deja elegir la región exacta: además de "Americas", aparece la lista de regiones. La opción que marca como "Recommended" sale de dónde está quien lo crea.

**Medición del 2026-11-22**, desde La Paz con la conexión del autor: tiempo de conexión TCP (una ida y vuelta) a los endpoints de AWS de cada región de América que ofrece Supabase, 15 muestras por región.

| Región                 | Mediana | Mínimo |
| ---------------------- | ------- | ------ |
| sa-east-1 (São Paulo)  | 127 ms  | 116 ms |
| us-east-1 (Virginia)   | 142 ms  | 130 ms |
| ca-central-1 (Canadá)  | 146 ms  | 140 ms |
| us-east-2 (Ohio)       | 152 ms  | 145 ms |
| us-west-1 (California) | 205 ms  | 198 ms |
| us-west-2 (Oregón)     | 212 ms  | 195 ms |

La demo actual (`dental-app-demo`) está en us-west-2, la peor de la lista. Medido contra ella el mismo día, un pedido a la API tarda unos 236 ms de mediana después de conectar. El borde de Cloudflare que atiende `*.supabase.co` está cerca (~28 ms), pero cada pedido igual viaja hasta Oregón.

El 2026-11-21 ya se había medido algo parecido: São Paulo 145 ms, Ohio 160 ms y Oregón 205 ms. São Paulo quedó primera las dos veces.

Sobre el límite de proyectos gratis: según la documentación de Supabase, los 2 proyectos activos **son por persona y se cuentan en todas las organizaciones** donde es Owner o Admin. Una organización nueva no da cupo extra. Los proyectos en pausa no cuentan. Hoy el único activo es `dental-app-demo`: LeaderShipApp y paludash están en pausa.

## Decisión

- **Los proyectos de Supabase van en sa-east-1 (São Paulo).** Vale para la demo y para producción.
- **La demo se pasa a un proyecto nuevo en sa-east-1**, porque Supabase no deja cambiar la región de un proyecto que ya existe. Sus datos son inventados y se reinician cada día (0015), así que no hay nada que copiar: se aplican las migraciones y el seed.
- **Antes de crear producción, se repite la medición desde la conexión de la dentista**, en el celular y en la red que use en el consultorio, por ejemplo con <https://www.cloudping.info>. Otro proveedor puede salir a internet por otro camino. Si en su conexión otra región queda claramente mejor (más de 20 ms de diferencia), producción va en esa región y se escribe una decisión nueva.
- Producción y la demo ocupan los 2 proyectos activos. Para volver a activar LeaderShipApp o paludash, habría que pausar la demo, poner producción en una organización cuyo Owner sea otra persona (por ejemplo, la dentista) o pagar Pro. Eso se decide al crear producción, no aquí.

## Consecuencias

- Cada consulta ahorra unos 80 ms frente a Oregón, la región actual de la demo. En una pantalla que hace tres consultas seguidas, son unos 250 ms menos. En Bolivia, con datos móviles, la diferencia se nota más que con una conexión fija.
- Los archivos de la web no cambian: Netlify los sirve desde su CDN, cerca de quien los pide, en cualquier región.
- Pasar la demo a otro proyecto cambia su ref, su URL y sus claves. Hay que actualizar:
  - Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` de Netlify (0010 y 0017), y volver a desplegar, porque se incrustan al compilar.
  - El secreto `DEMO_DB_URL` de GitHub (la cadena del Session pooler, que también cambia de región).
  - `PROYECTO_DEMO` en `.github/workflows/reiniciar-demo.yml`.
  - La configuración de autenticación del proyecto (URL del sitio y redirecciones), si se había ajustado en el panel.
  - El enlace local de la CLI (`supabase link`).
- Mientras se hace el cambio, la demo no responde un rato. El proyecto viejo en Oregón se borra después, para liberar el cupo.

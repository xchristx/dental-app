# 0009: Interfaz en celular y en escritorio

- **Fecha:** 2026-11-19
- **Estado:** aceptada
- **Complementa:** 0008. Mantiene el estilo y los tokens, y define cómo se adapta la interfaz a cada tamaño de pantalla.

## Contexto
La 0008 pensó la app sobre todo para el celular: la dentista usa más su Android que la laptop. Solo decía que desde tablet se ve la semana.

Pero la app también se usa en una pantalla grande:
- Para planificar la semana o cargar los horarios con calma, en la laptop.
- Las socias probablemente la consulten desde una computadora.
- Es un portafolio: quien la revise va a abrirla primero en el navegador de su computadora.

Estirar la versión del celular a una pantalla ancha desperdicia espacio y obliga a navegar de más.

## Decisión

### Tres tamaños, una sola app
Es la misma app web con las mismas rutas. Lo que cambia es la disposición, nunca lo que se puede hacer.

| Tamaño | Ancho | Navegación | Agenda | Formularios |
|---|---|---|---|---|
| Celular | menos de 768 px | Barra inferior | Día | Hoja inferior |
| Tablet | de 768 a 1023 px | Barra inferior | Semana | Panel lateral derecho |
| Escritorio | desde 1024 px | Barra lateral izquierda | Semana | Panel lateral derecho |

Se usan los cortes de Tailwind: `md` (768 px) y `lg` (1024 px).

### Navegación
- Secciones del MVP 1: **Agenda**, **Pacientes** y **Ajustes** (lugares y horarios).
- En celular y tablet: barra inferior fija, con ícono y texto en cada sección.
- En escritorio: barra lateral de 240 px, con el nombre de la app arriba.

### Agendar y editar
- En el celular, el botón "Agendar" queda fijo abajo, encima de la barra de navegación.
- Desde tablet, "Agendar" va en el encabezado de la agenda.
- Desde tablet, los formularios y el detalle de una cita se abren en un **panel lateral derecho**, no en un diálogo centrado. Así la agenda sigue a la vista mientras se elige la hora.

### Densidad
- Con pantalla táctil, el área mínima de toque sigue siendo de 44 × 44 px.
- Con mouse (`pointer: fine`), las vistas densas pueden usar controles de 36 px.
- El tamaño mínimo de texto sigue siendo 14 px en todos los tamaños.

### Teclado (escritorio)
Atajos para lo frecuente, que no reemplazan a los botones:
- `N`: nueva cita.
- `T`: ir a hoy.
- `←` y `→`: semana anterior y siguiente.
- `/`: buscar paciente.

### Ancho del contenido
- La agenda usa todo el ancho disponible.
- Las listas y los formularios tienen un ancho máximo de 768 px, para que las líneas no queden demasiado largas.

## Consecuencias
- Cada pantalla nueva se revisa en los tres tamaños antes de darla por terminada.
- Se agrega la hoja de shadcn/ui (`sheet`) con dos variantes: inferior en el celular y lateral desde tablet.
- La app Android de la fase 2 solo necesita la disposición del celular.

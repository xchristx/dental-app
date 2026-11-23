# Guía de diseño

Cómo se ve y cómo se comporta la interfaz. Las decisiones de fondo están en [0008](decisiones/0008-diseno-e-interfaz.md) (estilo), [0009](decisiones/0009-interfaz-en-celular-y-escritorio.md) (celular y escritorio) y [0032](decisiones/0032-revision-visual.md) (títulos, monograma y pantalla de entrada). Esta guía se puede ir ajustando; si un cambio contradice esas decisiones, se escribe una decisión nueva.

## Principios
1. **Rápida entre paciente y paciente.** Lo frecuente (ver el día, agendar, marcar "Llegó", mandar un recordatorio) está a uno o dos toques.
2. **El color significa algo.** Todo es monocromático salvo el lugar, el estado y los avisos.
3. **Plana.** Bordes finos en vez de sombras. Nada de degradados.
4. **Texto claro, sin jerga de software.** "Enviar recordatorio", no "Notificar". En español neutro con "tú".

## Tokens

Se definen una sola vez en [`apps/web/src/globals.css`](../apps/web/src/globals.css) (Tailwind v4). Todos los pares de texto y fondo cumplen contraste AA (4,5 o más).

En el código, los neutros usan los nombres de shadcn/ui, para que sus componentes funcionen sin cambios:

| Token de esta guía | Clase de Tailwind |
|---|---|
| `fondo` | `bg-background` |
| `superficie` | `bg-card` / `bg-popover` |
| `borde` | `border-border` |
| `texto` | `text-foreground` |
| `texto-secundario` | `text-muted-foreground` |
| `accion` / `accion-hover` | `bg-primary` / `hover:bg-primary-hover` |
| `peligro` | `bg-destructive-bg` + `text-destructive` |
| Aviso que no bloquea | `bg-warning-bg` + `text-warning` |
| `lugar-azul`, etc. | `bg-lugar-azul` + `text-lugar-azul-fg` |
| Fuente de títulos (Newsreader) | `font-heading` |
| Título de página / de hoja | `titulo-pagina` / `titulo-hoja` |
| Sombra de diálogos y hojas | `shadow-overlay` |

### Neutros
| Token | Valor | Uso |
|---|---|---|
| `fondo` | `#F7F6F3` | Fondo de la app |
| `superficie` | `#FFFFFF` | Tarjetas, hojas, diálogos |
| `borde` | `#EAEAEA` | Bordes y divisores, siempre de 1 px |
| `texto` | `#2F3437` | Texto principal (12,6:1) |
| `texto-secundario` | `#6F6E69` | Horas, datos secundarios (5,1:1) |
| `accion` | `#111111` | Botón principal, con texto blanco |
| `accion-hover` | `#333333` | Hover del botón principal |

### Color por lugar
Cada lugar elige uno de estos colores. En la agenda, la cita se ve con el fondo pálido y un borde izquierdo de 3 px del color del texto.

| Token | Fondo | Texto y borde | Contraste |
|---|---|---|---|
| `lugar-azul` | `#E1F3FE` | `#1F6C9F` | 5,0 |
| `lugar-verde` | `#EDF3EC` | `#346538` | 6,1 |
| `lugar-amarillo` | `#FBF3DB` | `#956400` | 4,6 |
| `lugar-morado` | `#F1EAF8` | `#6940A5` | 6,2 |
| `lugar-terracota` | `#FAEBDD` | `#9A4A12` | 5,4 |
| `lugar-gris` | `#EFEFED` | `#55534E` | 6,7 |

### Avisos
| Token | Fondo | Texto | Uso |
|---|---|---|---|
| `peligro` | `#FDEBEC` | `#9F2F2D` | Choques, errores, `no_asistio` |

El rojo **no** se usa como color de lugar, para que un choque nunca se confunda con un lugar.

### Odontograma
Los dos colores de la convención general (0020). Se usan solo en el odontograma: para pintar las caras, para los símbolos y para el texto de los códigos.

| Token | Valor | Uso | Contraste sobre blanco |
|---|---|---|---|
| `odontograma-rojo` | `#C4261D` | Hallazgos: lo que hay que tratar | 5,7 |
| `odontograma-azul` | `#1D5FC4` | Realizados: hecho o en buen estado | 6,0 |

En Tailwind: `text-odontograma-rojo`, `fill-odontograma-azul`, etc. El color nunca va solo: la tabla también separa hallazgos y realizados en columnas distintas, y el gráfico tiene leyenda.

### Forma y espacio
- Radios: `4px` para inputs y botones, `8px` para tarjetas, `12px` para hojas y diálogos. Las pills (`9999px`) solo en los badges.
- Sombras: ninguna en reposo. Solo los diálogos y las hojas llevan `0 8px 24px rgba(0,0,0,0.06)` para separarse del fondo.
- Toques: área mínima de **44 × 44 px**. Con mouse, las vistas densas pueden usar controles de 36 px (`size="sm"`).
- Margen lateral: 16 px en el celular, 24 px desde tablet y 32 px en escritorio.

## Tamaños de pantalla

Detalle en la decisión [0009](decisiones/0009-interfaz-en-celular-y-escritorio.md).

| | Celular (< `md`) | Tablet (`md`) | Escritorio (`lg`) |
|---|---|---|---|
| Navegación | Barra inferior | Barra inferior | Barra lateral de 240 px |
| Agenda | Día | Semana | Semana |
| "Agendar" | Fijo abajo | En el encabezado | En el encabezado |
| Formularios y detalle | Hoja inferior | Panel lateral derecho | Panel lateral derecho |

- **Barra inferior:** fondo `superficie`, borde superior de 1 px, ícono y texto (14 px) en cada sección. Respeta el área segura del celular (`env(safe-area-inset-bottom)`).
- **Barra lateral:** fondo `superficie` y borde derecho de 1 px. La sección activa lleva fondo `muted` y texto `texto`; las demás, texto `texto-secundario`.
- Las listas y los formularios llegan hasta 768 px de ancho y se centran en el espacio libre. La agenda usa todo el ancho.
- **Entrar:** en escritorio, dos columnas: qué hace la app con un día de muestra (el mismo `BloqueCita` de la agenda, con datos inventados) y el formulario. En el celular, solo el formulario.

## Tipografía
| Uso | Fuente | Detalle |
|---|---|---|
| Interfaz y texto | Geist Sans | Interlineado 1,5. Horas con `tabular-nums` para que se alineen |
| Título de cada página (`h1`), incluida la fecha de la agenda | Newsreader | `titulo-pagina`: 30 px, interlineado 1,1 y tracking -0,02em (0032) |
| Título de las hojas, marca "Sifel" y monograma grande | Newsreader | `titulo-hoja`: 24 px |
| Títulos de sección (`h2`) y todo lo demás | Geist Sans | La serif queda para el nivel más alto |
| Códigos del odontograma y números de recibo | Geist Mono | |

Se cargan con Fontsource, en `apps/web/src/main.tsx`. Tamaño mínimo de texto: 14 px. Los inputs, 16 px.

Los títulos (`h1` a `h3`) llevan `text-wrap: balance` y los párrafos, `text-wrap: pretty`, para que no quede una palabra sola en la última línea.

## Íconos
- Phosphor (`@phosphor-icons/react`), peso `bold`, en 16 o 20 px.
- Un ícono solo nunca reemplaza al texto en una acción importante. "Enviar recordatorio" lleva ícono **y** texto.
- Sin emojis en la interfaz.

## Componentes
- **Botón principal:** fondo `accion`, texto blanco, radio 4 px y sin sombra. Al presionarlo, `scale(0.98)`.
- **Botón secundario:** fondo `superficie`, borde de 1 px y texto `texto`.
- **Badge de estado:** pill, `text-xs` y `font-medium`, con mayúscula inicial ("Confirmada"). Sin mayúsculas completas: en la vista de semana las columnas son angostas y "CONFIRMADA" no entra.
  - `agendada`: gris.
  - `confirmada`: verde.
  - `atendida`: sin badge. Se muestra la hora de llegada.
  - `no_asistio`: peligro.
  - `cancelada`: tachada y con opacidad 50 %.
- **Listas:** filas separadas por un borde inferior. No van tarjetas dentro de tarjetas.
- **Monograma:** las iniciales del paciente en un cuadrado `muted` (40 px con radio 8 px en la lista, 56 px con radio 12 px en la ficha). Es decorativo: el nombre va siempre al lado.
- **Secciones de una página larga** (la ficha del paciente): cada una arranca con un divisor de 1 px y 24 px de aire arriba.
- **Vacío:** cuando la vista principal no tiene nada (un día sin citas), un recuadro con borde punteado, un ícono y qué hacer. En listas secundarias alcanza con una línea de texto.
- **Formularios:** en el celular, en una hoja inferior (sheet). Desde tablet, en un panel lateral derecho. Nunca en un diálogo centrado.
- **Cargando:** mientras una página carga, se ven formas grises fijas (esqueleto). Si lo que se tocó tarda en responder (una sección que no estaba precargada, otra semana), el indicador de carga (`components/ui/cargando.tsx`, un anillo que gira) reemplaza al ícono de lo que se tocó. Aparece recién a los 150 ms, así una carga rápida no parpadea. Al cambiar de semana, además, la semana anterior se atenúa al 50 % hasta que llega la nueva.

## Agenda

### Celular: vista de día
- Encabezado: la fecha en Newsreader ("Martes 24 de noviembre"), con flechas para el día anterior y el siguiente y un botón "Hoy".
- Tocar la fecha abre el calendario del sistema (`<input type="date">` con `showPicker()`) para ir a cualquier día de una vez. En Android es el selector que ella ya conoce. Una flecha hacia abajo junto a la fecha indica que se puede tocar.
- Línea de tiempo vertical de 10 a 21 h, según su horario. Una línea marca la hora actual.
- Los tramos de horario se ven con el fondo del lugar muy suave y el nombre del lugar arriba. Las horas fuera de horario se ven en gris rayado.
- Cada cita es un bloque con:
  - Paciente.
  - Tipo de cita.
  - Hora en `tabular-nums`.
  - Badge de estado.
  - Borde izquierdo del color del lugar.
- Los huecos libres se ven con borde punteado. Al tocar uno se abre "Nueva cita" con la hora ya puesta.
- Botón principal fijo abajo: "Agendar".

### Tablet y laptop: vista de semana
- Encabezado: el rango de la semana en Newsreader ("23 – 29 de noviembre"), con flechas, "Hoy" y el botón "Agendar". Tocar el rango abre el mismo calendario y lleva a la semana del día elegido.
- Siete columnas, con los mismos bloques de la vista de día. La columna de hoy se marca en el encabezado: el número en una pill `accion` y el borde inferior en `texto`.
- Al tocar una cita o un hueco, se abre el panel lateral derecho y la semana sigue a la vista.
- Atajos de teclado en escritorio: `N` nueva cita, `T` hoy, `←` y `→` para cambiar de semana, `/` buscar paciente.

### Avisos
- **Choque (bloquea):** banda `peligro` dentro de la hoja de la cita: "Ya tienes una cita en el consultorio de 10:00 a 11:00".
- **Traslado o fuera de horario (no bloquea):** banda amarilla con un botón "Agendar igual".

## Movimiento
- Solo transiciones cortas (150 a 200 ms) en hover, al presionar y al abrir hojas.
- Sin animaciones al hacer scroll ni apariciones escalonadas.
- La única animación continua es el indicador de carga.
- Se respeta `prefers-reduced-motion`. El indicador de carga no se detiene: gira más lento, para que se note que la app sigue trabajando.

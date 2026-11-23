# 0032: Revisión visual: títulos con Newsreader, monograma y pantalla de entrada

- **Fecha:** 2026-11-22
- **Estado:** aceptada
- **Cambia:** 0008, que reservaba Newsreader solo para la fecha de la agenda. Lo demás de 0008 (monocromático, plano, color solo con significado) sigue igual.

## Contexto

Se hizo una revisión general del aspecto de la web con las skills `redesign-existing-projects` y `modern-web-guidance`. La base estaba bien: tokens, contraste AA, esqueletos de carga, foco visible e íconos Phosphor. Pero fuera de la agenda la app se veía genérica:

- Los títulos de página eran Geist de 24 px, casi iguales a los de sección. La única pantalla con carácter era la agenda, gracias a la fecha en Newsreader.
- En escritorio, la columna de 768 px quedaba pegada a la izquierda, con unos 400 px vacíos a la derecha.
- La ficha del paciente se leía como una sola lista larga: ocho secciones con el mismo peso y nada que las separara.
- La pantalla de entrada no decía qué hace la app. Para un portafolio es lo primero que se ve.

## Decisión

### Newsreader en los títulos

- El título de cada página (`h1`) usa Newsreader con la utilidad `titulo-pagina`, igual que la fecha de la agenda: 30 px, interlineado 1,1 y tracking -0,02em.
- El título de las hojas (detalle de cita, formularios) usa `titulo-hoja`: 24 px.
- También la marca "Sifel" de la barra lateral y las iniciales del monograma grande.
- Los títulos de sección (`h2`) y todo el resto siguen en Geist. Así la serif marca el nivel más alto y no compite con los datos.

### Monograma del paciente

- Un cuadrado con las iniciales (primer nombre y primer apellido) en la lista de pacientes y en la ficha.
- Es monocromático (`muted`), porque el color está reservado para el lugar, el estado y los avisos.
- Es decorativo (`aria-hidden`): el nombre siempre está escrito al lado.
- `iniciales()` vive en `@dental/core`, para que la app Android dibuje lo mismo.

### Disposición

- En escritorio, las páginas de ancho limitado (pacientes, ficha, odontograma, ajustes) se centran en el espacio que deja la barra lateral.
- En la ficha, cada sección arranca con un divisor de 1 px.
- La columna de hoy en la semana lleva el borde inferior del encabezado en `texto`, además del número resaltado.
- Un día sin citas en el celular muestra un recuadro punteado con un ícono y qué hacer ("Con «Agendar» sumas una cita o un bloqueo"), en vez de una línea suelta.

### Pantalla de entrada

- En escritorio se divide en dos columnas. A la izquierda va qué hace la app, en tres líneas, y un día de muestra dibujado con el mismo componente de la agenda (`BloqueCita`) y pacientes inventados. A la derecha, el formulario de siempre.
- En el celular no cambia: solo el formulario.
- La muestra es decorativa para los lectores de pantalla. La lista de lo que hace la app sí se lee.

### Texto

- `text-wrap: balance` en `h1` a `h3` y `text-wrap: pretty` en párrafos. Es una mejora progresiva: un navegador que no lo soporta corta las líneas como siempre.

## Lo que no se toma de las skills

Lo que choca con la 0008 se deja fuera:

- Grano o ruido de fondo, degradados, fotos de fondo y vidrio esmerilado (`backdrop-filter`).
- Sombras de color o sombras en reposo.
- Apariciones escalonadas y animaciones al hacer scroll.
- Espacios enormes de landing page: entre secciones de la ficha quedan 48 px.

## Pendiente

La 0008 y `docs/diseno.md` piden una agenda en línea de tiempo (de 10 a 21 h, con los tramos de horario y los huecos libres con borde punteado). Hoy la agenda muestra las citas como lista. Es el cambio visual más grande que falta, y conviene hacerlo aparte.

## Consecuencias

- Toda página nueva usa `titulo-pagina` en su `h1`. Ninguna escribe a mano la fuente, el tamaño o el tracking.
- Si la muestra de la pantalla de entrada necesita otro campo cuando cambie `CitaAgenda`, TypeScript avisa, porque usa el mismo tipo.

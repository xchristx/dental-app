# 0008: Diseño e interfaz

- **Fecha:** 2026-11-19
- **Estado:** aceptada. El uso de Newsreader "solo para el título de la fecha" lo amplía la [0032](0032-revision-visual.md): ahora va en el título de cada página, en las hojas y en la marca.
- **Complementa:** 0001. Mantiene Tailwind y shadcn/ui, y define cómo se usan.

## Contexto

La app se usa sobre todo en un celular Android, entre paciente y paciente y con poco tiempo. Además es un portafolio, así que no debería verse como una plantilla genérica de shadcn.

La pregunta era si alcanza con Tailwind solo, sin shadcn/ui.

## Decisión

### Tailwind y shadcn/ui, no Tailwind solo

- **Tailwind v4** para todos los estilos, con los tokens de diseño definidos una sola vez en `@theme`.
- **shadcn/ui** solo para los componentes con comportamiento difícil: diálogo, hoja inferior (sheet), select, combobox para buscar pacientes, popover, selector de fecha y toast.
- Por qué no Tailwind solo:
  - Esos componentes necesitan manejar el foco, el teclado, ARIA y cerrar con "atrás". Hacerlos a mano lleva semanas y es fácil que queden inaccesibles.
  - shadcn/ui no es una dependencia: copia el código al repositorio y es nuestro. Se cambia su estilo para que siga nuestros tokens, y así no se ve como la plantilla por defecto.
- Los componentes simples (botón, tarjeta, badge, input) se hacen con Tailwind directamente.

### Estilo

- Base: la skill `minimalist-ui`, adaptada a una herramienta de trabajo. El detalle está en [`docs/diseno.md`](../diseno.md).
- Monocromático cálido. **El color solo se usa cuando significa algo**: el lugar de la cita, el estado, un choque.
- Tipografía **Geist Sans**, con números tabulares para las horas. **Newsreader** solo para el título de la fecha en la agenda.
- Íconos **Phosphor**. Se reemplaza Lucide, que es el que trae shadcn por defecto.
- Solo modo claro en el MVP 1. Los tokens permiten agregar el modo oscuro después.

### Lo que no se toma de la skill

Hay partes de `minimalist-ui` pensadas para landing pages que no sirven en una agenda:

- Animaciones al hacer scroll y apariciones escalonadas.
- Espacios verticales enormes.
- Fondos decorativos con imágenes o degradados.
- Gris secundario `#787774`, que no llega al contraste AA. Se usa uno más oscuro.

### Agenda

- Componente propio, sin FullCalendar ni librerías parecidas: estilizarlas cuesta más que hacer la vista.
- En el celular, vista de **día** como línea de tiempo vertical. Desde tablet, vista de **semana**.

## Consecuencias

- Los tokens son la única fuente de colores, espacios y radios. No se escriben colores sueltos en los componentes.
- En la fase 2, la app Expo puede reutilizar los mismos tokens con NativeWind.

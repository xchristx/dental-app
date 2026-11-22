# Alcance y etapas

Prioridad: resolver primero lo que más le complica a la dentista, que es **la agenda en varios lugares**.

## MVP 1: Agenda
- Una agenda con todas sus citas de todos los lugares, con un color por lugar.
- Citas de duración libre, con duraciones sugeridas según el tipo (control 1 h, retiro de puntos 15 min, cirugía 1,5 a 2 h).
- **Bloqueos**: "ocupada en la clínica de 15 a 18 h", sin necesidad de una ficha de paciente.
- **Próximo espacio libre**: se elige la duración y la app muestra los huecos disponibles.
- Control de choques:
  - Una profesional no puede estar en dos citas al mismo tiempo.
  - Un consultorio de un solo sillón no puede tener dos citas al mismo tiempo.
- Ficha básica del paciente: nombre, teléfono, fecha de nacimiento.
- Botón **"Enviar recordatorio"**: abre WhatsApp (link `wa.me`) con el mensaje ya escrito.
- **Horarios de atención** por lugar, que se cargan una vez (decisión 0004).
- Aviso de traslado cuando dos citas seguidas son en lugares distintos (decisión 0004).
- Estado de cada cita y **hora real de llegada** (decisión 0005).

## MVP 2: Historia clínica
- Anamnesis: antecedentes personales y familiares, alergias, medicamentos.
- Odontograma:
  - Vista de **tabla**, igual a la ficha en papel.
  - Vista **gráfica**, generada a partir de la tabla.
  - Soporta piezas permanentes y temporales.
  - Usa un **catálogo de códigos editable**.
- Evolución: qué se hizo en cada cita.
- Derivaciones: "derivado a" y "derivado por".

## MVP 3: Pagos y archivos
- Plan de tratamiento: total, cuota inicial y cuota sugerida.
- Libro de pagos (solo se agregan movimientos). El saldo se calcula, y se muestra con el mismo formato que su planilla de papel.
- Forma de pago (efectivo, QR o transferencia) y foto del comprobante.
- Recibo en PDF que se comparte por WhatsApp. Sin firma: ella confirmó que alcanza con el recibo (decisión 0028).
- Radiografías y fotos por paciente. En Android se pueden compartir desde WhatsApp.

## Después
- Consentimientos por tipo de tratamiento, con firma digital.
- Lista de pacientes a llamar para control (cada 3 a 6 meses).
- Acceso para las socias.
- App Android con funcionamiento sin conexión.

## Fuera del alcance
- Facturación electrónica del SIN.
- Reparto de honorarios entre socias.
- Seguros.

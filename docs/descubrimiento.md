# Descubrimiento

Lo que aprendimos de la dentista que va a usar la app antes de escribir código.
Fuente: preguntas por WhatsApp y una foto de su ficha en papel (18 y 19 de noviembre de 2026).

> Este repositorio no guarda datos de pacientes reales. La foto de la ficha se describe acá, pero no se incluye.

## Contexto

- Odontóloga general en Bolivia. Moneda: bolivianos (Bs). Zona horaria: `America/La_Paz` (UTC-4, sin horario de verano).
- Hoy lleva todo en papel: una agenda convencional y una historia clínica en papel por paciente.
- Trabaja en **dos lugares fijos**: su consultorio propio y una clínica. A veces atiende en el consultorio de alguna socia.
- Tiene **socias especialistas** (ortodoncia, implantología, etc.). Ellas también atienden a veces en su consultorio. Por ejemplo, la ortodoncista atiende a pacientes en el consultorio de ella.
- No tiene asistente: ella misma agenda todas las citas.
- Buen internet en el consultorio.
- Usa el celular más que la laptop. Su celular es **Android**.

## Problemas principales (en sus palabras)

1. **Pierde el control de su agenda** porque trabaja en varios lugares. Anota en papel y le saca foto a la agenda. Cuando tiene que dar la siguiente cita, "me pierdo un poco". Si se olvida de anotar algo, se le complica.
2. **Pacientes que no llegan a la hora indicada**, ya sea mucho antes o mucho después. Eso le desordena todo el día.

## Agenda

- Atiende más o menos de 10 a 21 h, según lo que necesite cada paciente.
- Entre 6 y 7 pacientes por día.
- Duración de las citas:
  - Normalmente 1 h.
  - Retiro de puntos: 15 min.
  - Cirugía: de 45 min a 2 h, según el diagnóstico.
- Recuerda las citas a mano por WhatsApp.
- Si un paciente falta: si después le escribe, lo reagenda en el próximo hueco libre. Si no le escribe, no lo vuelve a contactar.
- Los pacientes que se mantienen vienen a control cada 3 a 6 meses.
- **Sillones:**
  - Su consultorio tiene uno solo. Probablemente los de las socias también.
  - En la clínica hay varios, pero se los asignan; ella no elige.
- Las socias tienen su propia agenda y trabajan en varios lugares. Probablemente usarían la app al menos para consultar.

## Derivaciones

- Los pacientes se derivan en los dos sentidos:
  - Ella deriva pacientes al implantólogo y a la ortodoncista, y después vuelven a ella para controles.
  - Las socias le derivan pacientes para endodoncia.
- Cómo se reparte el dinero depende de la especialidad de cada una. **Fuera del alcance por ahora.**

## Historia clínica

- Una historia clínica en papel por paciente:
  - **Frente:** el diagnóstico y lo que se hizo en cada cita.
  - **Reverso:** la planilla de pagos.
- Datos de un paciente nuevo: datos personales, antecedentes personales y familiares, alergias y medicamentos.
- **Consentimientos:** uno por tipo de tratamiento (endodoncia, cirugía, ortodoncia). Son hojas aparte que se abrochan a la historia.
- **Radiografías:** las tiene en papel, abrochadas a la historia. También se las mandan por WhatsApp, y esas están desordenadas.

## Odontograma (foto de una ficha en papel)

No es un dibujo: es una **tabla con una fila por pieza dental**.

- Columnas: número de pieza (FDI), número de pieza temporal, diagnóstico presuntivo, Rx y tratamiento.
- Piezas permanentes de 18 a 48 y temporales de 55 a 85 en la misma fila, porque atiende niños con dentición mixta.
- Cada fila tiene un código de texto, por ejemplo `II-O y M y V` o `Obt-OM`.
- Una sola anotación puede abarcar varias piezas. Por ejemplo, una llave que agrupa de la 33 a la 43 con "cálculo abundante".
- Datos generales de la ficha:
  - ¿Usa mondadientes?
  - ¿Se cepilla la lengua?
  - Oclusión (por ejemplo "mordida abierta")
  - Tártaro, halitosis, placa bacteriana y materia alba

### Abreviaturas (inferidas, **falta que ella las confirme**)

| Código | Significado probable | Confianza |
|---|---|---|
| I, II, III, IV | Grado de caries: I esmalte · II dentina · III llega a la pulpa · IV pulpa necrótica | Alta |
| O, M, D, V, P, L | Caras: oclusal, mesial, distal, vestibular, palatina, lingual | Alta |
| `II-O y M y V` | Caries grado II en oclusal, mesial y vestibular | Alta |
| `I-P` | Caries grado I en palatina | Alta |
| `Obt-OM` | Obturación existente en oclusal-mesial | Alta |
| `Obt-OU` | Probablemente `Obt-OV`: la "V" escrita a mano parece una "U" | Media |
| `Rec. Obt M` | Recidiva: caries debajo de una obturación mesial | Media |
| `Medicación - OD` | Obturación provisional con medicación en oclusal-distal | Media |
| `Obt C` | Obturación cervical | Baja |
| `MV` | Mesioversión. Otras posiciones posibles: DV, VV, PV/LV, giroversión | Alta |
| Corona, Incrustación | Restauraciones existentes. "Con fístula" indica infección asociada | Alta |
| `N` | ¿Normal? Es raro, porque las piezas sanas quedan en blanco | Baja |
| Tildes en 18, 28, 38, 48 | ¿Muelas del juicio ausentes o para extraer? | Baja |
| Barritas en 55, 74, 75, 85 | ¿Indican qué piezas temporales están presentes? | Baja |
| ✓ en la columna Rx | Radiografía **tomada** | Confirmada (2026-11-22) |

## Pagos

- Formas de pago: efectivo, QR o transferencia.
- No entrega recibos, pero le parecería bien agregarlos.
- No trabaja con seguros.
- **Planilla de cuotas**, en el reverso de la historia:
  - Al principio se le explica al paciente el costo total y se registra.
  - Cada fila tiene: fecha, cuota abonada, saldo anterior, saldo actual y **firma del paciente**.
  - Sirve para que ella y el paciente lleven la cuenta.
- Ejemplo real (un tratamiento de ortodoncia):
  - Cuota inicial de 1000 Bs. Quedaban 5500 Bs, que se pagaron en cuotas de 400 Bs.
  - El resto del saldo se paga al final del último mes.
  - Si el tratamiento se alarga, se siguen pagando cuotas de 400 Bs hasta cubrir el saldo.

## Preguntas pendientes

Ver [preguntas-pendientes.md](preguntas-pendientes.md). Ahí también está el mensaje listo para mandarle por WhatsApp.

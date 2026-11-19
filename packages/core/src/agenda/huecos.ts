/**
 * Huecos libres, lugar sugerido y avisos que no bloquean (decisión 0004).
 *
 * Todo es una sugerencia: la palabra final la tienen las restricciones de
 * exclusión de Postgres (0002).
 */
import { ESTADOS_QUE_OCUPAN, type EstadoCita } from '../citas/estados'
import { instanteLocal, type Fecha } from '../fechas/fechas'

/** Un tramo de atención: "martes de 15:00 a 18:00 en la clínica". */
export interface Horario {
  profesionalId: string
  lugarId: string
  /** ISO 8601: 1 lunes … 7 domingo. */
  diaSemana: number
  /** "HH:MM" o "HH:MM:SS", hora local. */
  horaInicio: string
  horaFin: string
  vigenteDesde: Fecha
  vigenteHasta: Fecha | null
}

/** Lo mínimo de una cita para saber si ocupa la agenda. */
export interface CitaOcupada {
  profesionalId: string
  lugarId: string
  inicio: Date
  fin: Date
  estado: EstadoCita
}

export interface Lugar {
  id: string
  controlaSillon: boolean
}

export interface Intervalo {
  inicio: Date
  fin: Date
}

export interface Hueco extends Intervalo {
  lugarId: string
}

const MINUTO = 60_000

function ocupa(cita: CitaOcupada) {
  return (ESTADOS_QUE_OCUPAN as readonly EstadoCita[]).includes(cita.estado)
}

/** Día de la semana ISO (1 lunes … 7 domingo) de una fecha. */
export function diaSemanaIso(fecha: Fecha): number {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay()
  return d === 0 ? 7 : d
}

/** Tramos de atención de la profesional que valen ese día, ordenados por hora. */
export function tramosDelDia(
  horarios: Horario[],
  profesionalId: string,
  fecha: Fecha,
  zona: string,
): (Intervalo & { lugarId: string })[] {
  const dia = diaSemanaIso(fecha)
  return horarios
    .filter(
      (h) =>
        h.profesionalId === profesionalId &&
        h.diaSemana === dia &&
        h.vigenteDesde <= fecha &&
        (h.vigenteHasta === null || fecha <= h.vigenteHasta),
    )
    .map((h) => ({
      lugarId: h.lugarId,
      inicio: instanteLocal(fecha, h.horaInicio.slice(0, 5), zona),
      fin: instanteLocal(fecha, h.horaFin.slice(0, 5), zona),
    }))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
}

/** Resta de un intervalo una lista de bloqueos. */
function restar(base: Intervalo, bloqueos: Intervalo[]): Intervalo[] {
  const libres: Intervalo[] = []
  let desde = base.inicio.getTime()
  const ordenados = [...bloqueos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
  for (const b of ordenados) {
    const bi = b.inicio.getTime()
    const bf = b.fin.getTime()
    if (bf <= desde || bi >= base.fin.getTime()) continue
    if (bi > desde) libres.push({ inicio: new Date(desde), fin: new Date(bi) })
    desde = Math.max(desde, bf)
  }
  if (desde < base.fin.getTime()) libres.push({ inicio: new Date(desde), fin: base.fin })
  return libres
}

export interface ParametrosHuecos {
  fecha: Fecha
  zona: string
  profesionalId: string
  margenTrasladoMin: number
  horarios: Horario[]
  lugares: Lugar[]
  /** Citas de ese día, de todas las profesionales. */
  citas: CitaOcupada[]
  /** No se sugiere nada antes de este momento (por ejemplo, ahora). */
  desde?: Date
}

/**
 * Huecos libres de la profesional ese día, en cada lugar donde atiende:
 * su horario, menos sus citas, menos las citas del lugar si controla el
 * sillón, menos el margen de traslado alrededor de citas en otros lugares.
 */
export function huecosLibres(p: ParametrosHuecos): Hueco[] {
  const activas = p.citas.filter(ocupa)
  const margen = p.margenTrasladoMin * MINUTO
  const controla = new Map(p.lugares.map((l) => [l.id, l.controlaSillon]))

  return tramosDelDia(p.horarios, p.profesionalId, p.fecha, p.zona).flatMap((tramo) => {
    const bloqueos: Intervalo[] = []
    for (const c of activas) {
      if (c.profesionalId === p.profesionalId) {
        // Sus propias citas; si son en otro lugar, más el tiempo para trasladarse.
        const extra = c.lugarId === tramo.lugarId ? 0 : margen
        bloqueos.push({
          inicio: new Date(c.inicio.getTime() - extra),
          fin: new Date(c.fin.getTime() + extra),
        })
      } else if (c.lugarId === tramo.lugarId && controla.get(c.lugarId)) {
        // Otra profesional en un lugar de un solo sillón.
        bloqueos.push(c)
      }
    }
    if (p.desde) bloqueos.push({ inicio: new Date(0), fin: p.desde })
    return restar(tramo, bloqueos).map((libre) => ({ ...libre, lugarId: tramo.lugarId }))
  })
}

/**
 * Horas de inicio posibles dentro de los huecos, cada `pasoMin` minutos, para
 * una cita de `duracionMin`. "10:00, 10:15, 10:30…"
 */
export function horasSugeridas(huecos: Hueco[], duracionMin: number, pasoMin = 15): Hueco[] {
  const duracion = duracionMin * MINUTO
  const paso = pasoMin * MINUTO
  const sugeridas: Hueco[] = []
  for (const h of huecos) {
    let inicio = Math.ceil(h.inicio.getTime() / paso) * paso
    while (inicio + duracion <= h.fin.getTime()) {
      sugeridas.push({
        lugarId: h.lugarId,
        inicio: new Date(inicio),
        fin: new Date(inicio + duracion),
      })
      inicio += paso
    }
  }
  return sugeridas
}

/** Lugar donde la profesional atiende a esa hora, o el primero del día. */
export function lugarSugerido(
  horarios: Horario[],
  profesionalId: string,
  fecha: Fecha,
  zona: string,
  hora?: Date,
): string | null {
  const tramos = tramosDelDia(horarios, profesionalId, fecha, zona)
  if (hora) {
    const t = tramos.find((t) => t.inicio <= hora && hora < t.fin)
    if (t) return t.lugarId
  }
  return tramos[0]?.lugarId ?? null
}

export type AvisoCita =
  | { tipo: 'fuera_de_horario' }
  | {
      tipo: 'traslado'
      /** La otra cita es antes o después de la nueva. */
      posicion: 'antes' | 'despues'
      otroLugarId: string
      /** Minutos libres entre las dos citas (puede ser 0). */
      minutosLibres: number
    }

/**
 * Avisos que no bloquean (0004): la cita queda fuera del horario en ese
 * lugar, o queda poco tiempo para trasladarse desde o hacia otro lugar.
 */
export function avisosDeCita(
  cita: { profesionalId: string; lugarId: string; inicio: Date; fin: Date },
  contexto: {
    fecha: Fecha
    zona: string
    margenTrasladoMin: number
    horarios: Horario[]
    /** Citas de ese día; si incluye la misma cita, se ignora por id. */
    citas: (CitaOcupada & { id?: string })[]
    idCita?: string
  },
): AvisoCita[] {
  const avisos: AvisoCita[] = []

  const dentroDeHorario = tramosDelDia(
    contexto.horarios,
    cita.profesionalId,
    contexto.fecha,
    contexto.zona,
  ).some((t) => t.lugarId === cita.lugarId && t.inicio <= cita.inicio && cita.fin <= t.fin)
  if (!dentroDeHorario) avisos.push({ tipo: 'fuera_de_horario' })

  const margen = contexto.margenTrasladoMin * MINUTO
  const propias = contexto.citas.filter(
    (c) =>
      ocupa(c) &&
      c.profesionalId === cita.profesionalId &&
      c.lugarId !== cita.lugarId &&
      (contexto.idCita === undefined || c.id !== contexto.idCita),
  )

  for (const c of propias) {
    const despuesDeLaOtra = cita.inicio.getTime() - c.fin.getTime()
    const antesDeLaOtra = c.inicio.getTime() - cita.fin.getTime()
    if (despuesDeLaOtra >= 0 && despuesDeLaOtra < margen) {
      avisos.push({
        tipo: 'traslado',
        posicion: 'antes',
        otroLugarId: c.lugarId,
        minutosLibres: Math.round(despuesDeLaOtra / MINUTO),
      })
    } else if (antesDeLaOtra >= 0 && antesDeLaOtra < margen) {
      avisos.push({
        tipo: 'traslado',
        posicion: 'despues',
        otroLugarId: c.lugarId,
        minutosLibres: Math.round(antesDeLaOtra / MINUTO),
      })
    }
  }
  return avisos
}

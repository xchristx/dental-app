import { useEffect, useId, useMemo, useState, useTransition } from 'react'
import { useIr } from '@/lib/navegacion'
import { CalendarPlusIcon, UserPlusIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import {
  avisosDeCita,
  coincideBusqueda,
  esFechaValida,
  esHoraValida,
  fechaEnZona,
  formatearDiaLargo,
  formatearHora,
  horasSugeridas,
  huecosLibres,
  instanteLocal,
  lugarSugerido,
  nombreConEspecialidad,
  tramosDelDia,
  type AvisoCita,
  type CitaOcupada,
  type Fecha,
  type Hueco,
} from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  agendarCita,
  ocupacionDelDia,
  pacientesParaAgendar,
  reagendarCita,
  type PacienteParaAgendar,
} from '@/lib/agenda/acciones'
import type { OpcionesAgendar } from '@/lib/agenda/opciones'
import { ZONA } from '@/lib/agenda/zona'
import { cn } from '@/lib/utils'

const DURACIONES = [15, 30, 45, 60, 90, 120, 150, 180]

/** Cuántos horarios libres se muestran por lugar. */
const MAX_HORAS_POR_LUGAR = 8

const claseCampo =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

type Modo = 'paciente' | 'bloqueo'

interface Formulario {
  id: string
  modo: Modo
  pacienteId: string | null
  pacienteNuevo: { id: string; nombre: string; telefono: string } | null
  busqueda: string
  profesionalId: string
  lugarId: string
  tipoCitaId: string
  fecha: Fecha
  hora: string
  /** Si eligió la hora o el lugar; si no, se propone el primer horario libre. */
  horaTocada: boolean
  duracionMin: number
  nota: string
}

/** La cita que se reagenda (0012): el formulario empieza con sus datos. */
export interface DatosReagendar {
  citaId: string
  paciente: string
  profesionalId: string
  lugarId: string
  tipoCitaId: string | null
  duracionMin: number
  nota: string | null
  inicio: Date
  /** Cómo queda la original al reagendar. */
  quedaComo: 'cancelada' | 'no_asistio'
}

function formularioInicial(
  opciones: OpcionesAgendar,
  fecha: Fecha,
  reagendar?: DatosReagendar,
): Formulario {
  if (reagendar) {
    return {
      id: crypto.randomUUID(),
      modo: 'paciente',
      pacienteId: null,
      pacienteNuevo: null,
      busqueda: '',
      profesionalId: reagendar.profesionalId,
      lugarId: reagendar.lugarId,
      tipoCitaId: reagendar.tipoCitaId ?? '',
      fecha,
      hora: formatearHora(reagendar.inicio, ZONA),
      horaTocada: false,
      duracionMin: reagendar.duracionMin,
      nota: reagendar.nota ?? '',
    }
  }
  const tipo = opciones.tiposCita[0]
  const profesionalId = opciones.profesionalPropia ?? opciones.profesionales[0]?.id ?? ''
  return {
    id: crypto.randomUUID(),
    modo: 'paciente',
    pacienteId: null,
    pacienteNuevo: null,
    busqueda: '',
    profesionalId,
    // Donde atiende ese día según su horario (0004); si no tiene, el primero.
    lugarId:
      lugarSugerido(opciones.horarios, profesionalId, fecha, ZONA) ?? opciones.lugares[0]?.id ?? '',
    tipoCitaId: tipo?.id ?? '',
    fecha,
    hora: '10:00',
    horaTocada: false,
    duracionMin: tipo?.duracionMin ?? 60,
    nota: '',
  }
}

function sumarMinutos(hora: string, minutos: number) {
  const [h = 0, m = 0] = hora.split(':').map(Number)
  const total = (h * 60 + m + minutos) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Botones "Agendar" (fijo abajo en el celular, en el encabezado desde tablet) y su formulario. */
export function AgendarCita({ opciones, fecha }: { opciones: OpcionesAgendar; fecha: Fecha }) {
  const [abierto, setAbierto] = useState(false)
  // Cada vez que se abre, el formulario empieza de cero.
  const [vez, setVez] = useState(0)
  const ir = useIr()

  function abrir() {
    setVez((v) => v + 1)
    setAbierto(true)
  }

  return (
    <>
      {/* Desde tablet: en el encabezado */}
      <Button className="hidden md:inline-flex" onClick={abrir}>
        <CalendarPlusIcon weight="bold" />
        Agendar
      </Button>

      {/* Celular: fijo abajo, encima de la barra de navegación */}
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 md:hidden">
        <Button size="lg" className="w-full" onClick={abrir}>
          <CalendarPlusIcon weight="bold" />
          Agendar
        </Button>
      </div>

      <FormularioCita
        key={vez}
        opciones={opciones}
        fecha={fecha}
        abierto={abierto}
        onOpenChange={setAbierto}
        onGuardada={(guardada) => {
          setAbierto(false)
          if (guardada.fecha !== fecha) void ir(`/?fecha=${guardada.fecha}`)
        }}
      />
    </>
  )
}

/**
 * Formulario de una cita nueva, de un bloqueo o de una cita reagendada (0012).
 * Muestra los horarios libres del día y avisa de traslados (0004).
 */
export function FormularioCita({
  opciones,
  fecha,
  abierto,
  onOpenChange,
  onGuardada,
  reagendar,
}: {
  opciones: OpcionesAgendar
  /** Día con el que empieza el formulario. */
  fecha: Fecha
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  onGuardada: (cita: { id: string; fecha: Fecha }) => void
  reagendar?: DatosReagendar
}) {
  const [form, setForm] = useState(() => formularioInicial(opciones, fecha, reagendar))
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciarGuardado] = useTransition()
  const ids = useId()

  // La lista de pacientes se pide al abrir el formulario: no viaja con cada
  // semana de la agenda. Al reagendar no hace falta (el paciente es el mismo).
  const [pacientes, setPacientes] = useState<PacienteParaAgendar[] | null>(null)
  const [sinPacientes, setSinPacientes] = useState(false)
  useEffect(() => {
    if (!abierto || reagendar || pacientes) return
    let vigente = true
    pacientesParaAgendar()
      .then((lista) => vigente && setPacientes(lista))
      // Sin la lista se puede agendar igual a un paciente nuevo.
      .catch(() => vigente && setSinPacientes(true))
    return () => {
      vigente = false
    }
  }, [abierto, reagendar, pacientes])

  // Al cambiar algo, el aviso anterior ya no aplica.
  const cambiar = (cambios: Partial<Formulario>) => {
    setError(null)
    setForm((f) => ({ ...f, ...cambios }))
  }

  const coincidencias = useMemo(() => {
    // "lucia" encuentra a Lucía; "ana per", a Ana Pérez.
    if (form.busqueda.trim().length < 2) return []
    return (pacientes ?? []).filter((p) => coincideBusqueda(p.nombre, form.busqueda)).slice(0, 6)
  }, [form.busqueda, pacientes])

  const pacienteElegido = pacientes?.find((p) => p.id === form.pacienteId)
  const duraciones = DURACIONES.includes(form.duracionMin)
    ? DURACIONES
    : [...DURACIONES, form.duracionMin].sort((a, b) => a - b)

  // Citas del día elegido (de todas las profesionales), para huecos y avisos.
  const [ocupacion, setOcupacion] = useState<{
    fecha: Fecha
    citas: (CitaOcupada & { id: string })[]
  } | null>(null)
  useEffect(() => {
    if (!abierto || !esFechaValida(form.fecha)) return
    let vigente = true
    const fechaPedida = form.fecha
    ocupacionDelDia(fechaPedida)
      .then((citas) => {
        if (!vigente) return
        setOcupacion({
          fecha: fechaPedida,
          citas: citas.map((c) => ({ ...c, inicio: new Date(c.inicio), fin: new Date(c.fin) })),
        })
      })
      // Sin huecos sugeridos se puede agendar igual; Postgres sigue impidiendo los choques.
      .catch(() => vigente && setOcupacion({ fecha: fechaPedida, citas: [] }))
    return () => {
      vigente = false
    }
  }, [abierto, form.fecha])

  // Al reagendar, el horario de la original queda libre: no cuenta.
  const citasDelDia =
    ocupacion?.fecha === form.fecha
      ? ocupacion.citas.filter((c) => c.id !== reagendar?.citaId)
      : null
  const profesional = opciones.profesionales.find((p) => p.id === form.profesionalId)
  const margenTrasladoMin = profesional?.margenTrasladoMin ?? 30
  const nombreLugar = (id: string) =>
    opciones.lugares.find((l) => l.id === id)?.nombre ?? 'otro lugar'

  const tieneHorario = useMemo(
    () =>
      esFechaValida(form.fecha) &&
      tramosDelDia(opciones.horarios, form.profesionalId, form.fecha, ZONA).length > 0,
    [opciones.horarios, form.profesionalId, form.fecha],
  )

  const horasLibres = useMemo(() => {
    if (!citasDelDia) return null
    const esHoy = form.fecha === fechaEnZona(new Date(), ZONA)
    const huecos = huecosLibres({
      fecha: form.fecha,
      zona: ZONA,
      profesionalId: form.profesionalId,
      margenTrasladoMin,
      horarios: opciones.horarios,
      lugares: opciones.lugares,
      citas: citasDelDia,
      desde: esHoy ? new Date() : undefined,
    })
    // Agrupadas por lugar, en el orden del día.
    const porLugar = new Map<string, Hueco[]>()
    for (const h of horasSugeridas(huecos, form.duracionMin)) {
      const lista = porLugar.get(h.lugarId) ?? []
      if (lista.length < MAX_HORAS_POR_LUGAR) porLugar.set(h.lugarId, [...lista, h])
    }
    return [...porLugar.entries()]
  }, [citasDelDia, form.fecha, form.profesionalId, form.duracionMin, margenTrasladoMin, opciones])

  // Mientras no elija, se propone el primer horario libre del día.
  const primeraLibre = horasLibres
    ?.flatMap(([, horas]) => horas)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0]
  const usarSugerida = !form.horaTocada && primeraLibre !== undefined
  const horaFinal = usarSugerida ? formatearHora(primeraLibre.inicio, ZONA) : form.hora
  const lugarFinal = usarSugerida ? primeraLibre.lugarId : form.lugarId

  // Avisos que no bloquean (0004 y 0013). En un bloqueo no aplican.
  const avisos = useMemo(() => {
    if (form.modo !== 'paciente' || !citasDelDia || !esHoraValida(horaFinal)) return []
    const inicio = instanteLocal(form.fecha, horaFinal, ZONA)
    const lista = avisosDeCita(
      {
        profesionalId: form.profesionalId,
        lugarId: lugarFinal,
        inicio,
        fin: new Date(inicio.getTime() + form.duracionMin * 60_000),
      },
      {
        fecha: form.fecha,
        zona: ZONA,
        margenTrasladoMin,
        horarios: opciones.horarios,
        citas: citasDelDia,
        ahora: new Date(),
      },
    )
    // Al reagendar, una hora pasada no es un aviso sino un error (se valida al guardar).
    return reagendar ? lista.filter((a) => a.tipo !== 'en_el_pasado') : lista
  }, [form, horaFinal, lugarFinal, citasDelDia, margenTrasladoMin, opciones.horarios, reagendar])

  function textoAviso(aviso: AvisoCita) {
    if (aviso.tipo === 'en_el_pasado') {
      return 'Esa hora ya pasó. Puedes agendarla igual para anotar una cita que ya ocurrió.'
    }
    if (aviso.tipo === 'fuera_de_horario') {
      return `Está fuera del horario de atención en ${nombreLugar(lugarFinal)} ese día.`
    }
    const otro = nombreLugar(aviso.otroLugarId)
    const cuando = aviso.posicion === 'antes' ? 'Justo antes' : 'Justo después'
    const tiempo =
      aviso.minutosLibres === 0
        ? 'no queda tiempo para el traslado'
        : `quedan ${aviso.minutosLibres} min para el traslado`
    return `${cuando} hay una cita en ${otro}: ${tiempo} (el margen es de ${margenTrasladoMin} min).`
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

    if (reagendar) {
      if (esHoraValida(horaFinal) && instanteLocal(form.fecha, horaFinal, ZONA) <= new Date()) {
        setError('Elige un horario que todavía no haya pasado.')
        return
      }
      iniciarGuardado(async () => {
        const resultado = await reagendarCita({
          citaOriginalId: reagendar.citaId,
          id: form.id,
          profesionalId: form.profesionalId,
          lugarId: lugarFinal,
          tipoCitaId: form.tipoCitaId || null,
          fecha: form.fecha,
          hora: horaFinal,
          duracionMin: form.duracionMin,
          nota: form.nota,
        })
        if (!resultado.ok) setError(resultado.error)
        else onGuardada({ id: resultado.id, fecha: resultado.fecha })
      })
      return
    }

    const paciente =
      form.modo === 'bloqueo'
        ? { tipo: 'bloqueo' as const }
        : form.pacienteNuevo
          ? { tipo: 'nuevo' as const, ...form.pacienteNuevo }
          : form.pacienteId
            ? { tipo: 'existente' as const, id: form.pacienteId }
            : null
    if (!paciente) {
      setError('Elige un paciente o agrega uno nuevo.')
      return
    }

    iniciarGuardado(async () => {
      const resultado = await agendarCita({
        id: form.id,
        paciente,
        profesionalId: form.profesionalId,
        lugarId: lugarFinal,
        tipoCitaId: form.modo === 'bloqueo' ? null : form.tipoCitaId || null,
        fecha: form.fecha,
        hora: horaFinal,
        duracionMin: form.duracionMin,
        nota: form.nota,
      })
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      onGuardada({ id: form.id, fecha: resultado.fecha })
    })
  }

  const titulo = reagendar
    ? `Reagendar a ${reagendar.paciente}`
    : form.modo === 'bloqueo'
      ? 'Nuevo bloqueo'
      : 'Nueva cita'
  const descripcion = reagendar
    ? `La cita del ${formatearDiaLargo(fechaEnZona(reagendar.inicio, ZONA)).toLowerCase()} a las ${formatearHora(reagendar.inicio, ZONA)} queda ${reagendar.quedaComo === 'cancelada' ? 'cancelada' : 'como «No asistió»'}.`
    : form.modo === 'bloqueo'
      ? 'Un tiempo en que no atiendes: un trámite, la clínica, un viaje.'
      : 'Si el horario choca con otra cita, te avisamos al guardar.'

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{titulo}</SheetTitle>
            <SheetDescription>{descripcion}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
            {/* Cita o bloqueo */}
            {!reagendar && (
              <div
                role="radiogroup"
                aria-label="Qué vas a agendar"
                className="bg-muted grid grid-cols-2 gap-1 rounded-sm p-1"
              >
                {(['paciente', 'bloqueo'] as const).map((modo) => (
                  <button
                    key={modo}
                    type="button"
                    role="radio"
                    aria-checked={form.modo === modo}
                    onClick={() => cambiar({ modo })}
                    className={cn(
                      'h-9 rounded-sm text-sm font-medium transition-colors duration-150',
                      form.modo === modo ? 'bg-card text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {modo === 'paciente' ? 'Cita con paciente' : 'Bloqueo'}
                  </button>
                ))}
              </div>
            )}

            {/* Al reagendar, el paciente es el de la original. */}
            {form.modo === 'paciente' && !reagendar && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium">Paciente</legend>

                {pacienteElegido || form.pacienteNuevo ? (
                  <div className="border-border bg-card flex items-center justify-between gap-2 rounded-sm border py-1 pl-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {pacienteElegido?.nombre ?? form.pacienteNuevo?.nombre}
                      </p>
                      {form.pacienteNuevo && (
                        <p className="text-muted-foreground text-sm">Paciente nuevo</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Cambiar paciente"
                      onClick={() => cambiar({ pacienteId: null, pacienteNuevo: null })}
                    >
                      <XIcon weight="bold" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="search"
                      aria-label="Buscar paciente"
                      placeholder="Escribe el nombre"
                      autoComplete="off"
                      value={form.busqueda}
                      onChange={(e) => cambiar({ busqueda: e.target.value })}
                      className={claseCampo}
                    />
                    {coincidencias.length > 0 && (
                      <ul className="border-border bg-card divide-border divide-y rounded-sm border">
                        {coincidencias.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => cambiar({ pacienteId: p.id, busqueda: '' })}
                              className="hover:bg-muted flex min-h-11 w-full items-center px-3 text-left"
                            >
                              {p.nombre}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {form.busqueda.trim().length >= 2 && pacientes === null && (
                      <p className="text-muted-foreground text-sm" role="status">
                        {sinPacientes
                          ? 'No pudimos cargar la lista de pacientes. Puedes agregarlo como nuevo.'
                          : 'Buscando pacientes…'}
                      </p>
                    )}
                    {form.busqueda.trim().length >= 2 && (pacientes !== null || sinPacientes) && (
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start"
                        onClick={() =>
                          cambiar({
                            pacienteNuevo: {
                              id: crypto.randomUUID(),
                              nombre: form.busqueda.trim(),
                              telefono: '',
                            },
                            busqueda: '',
                          })
                        }
                      >
                        <UserPlusIcon weight="bold" />
                        <span className="truncate">
                          Agregar «{form.busqueda.trim()}» como paciente nuevo
                        </span>
                      </Button>
                    )}
                  </>
                )}

                {form.pacienteNuevo && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Teléfono (opcional)
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="off"
                      placeholder="Para enviarle recordatorios por WhatsApp"
                      value={form.pacienteNuevo.telefono}
                      onChange={(e) =>
                        cambiar({
                          pacienteNuevo: form.pacienteNuevo && {
                            ...form.pacienteNuevo,
                            telefono: e.target.value,
                          },
                        })
                      }
                      className={claseCampo}
                    />
                  </label>
                )}
              </fieldset>
            )}

            {form.modo === 'paciente' && opciones.tiposCita.length > 0 && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Tipo de cita
                <select
                  value={form.tipoCitaId}
                  onChange={(e) => {
                    const tipo = opciones.tiposCita.find((t) => t.id === e.target.value)
                    // La duración se sugiere según el tipo; se puede cambiar.
                    cambiar({
                      tipoCitaId: e.target.value,
                      duracionMin: tipo?.duracionMin ?? form.duracionMin,
                    })
                  }}
                  className={claseCampo}
                >
                  {opciones.tiposCita.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {opciones.profesionales.length > 1 && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Profesional
                <select
                  value={form.profesionalId}
                  onChange={(e) => cambiar({ profesionalId: e.target.value, horaTocada: false })}
                  className={claseCampo}
                >
                  {opciones.profesionales.map((p) => (
                    <option key={p.id} value={p.id}>
                      {nombreConEspecialidad(p)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Fecha
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) => cambiar({ fecha: e.target.value, horaTocada: false })}
                  className={claseCampo}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Duración
                <select
                  value={form.duracionMin}
                  onChange={(e) => cambiar({ duracionMin: Number(e.target.value) })}
                  className={claseCampo}
                >
                  {duraciones.map((min) => (
                    <option key={min} value={min}>
                      {min < 60
                        ? `${min} min`
                        : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Horarios libres (0004): tocar uno pone la hora y el lugar. */}
            <section aria-labelledby={`${ids}-libres`} className="flex flex-col gap-2">
              <h3 id={`${ids}-libres`} className="text-sm font-medium">
                Horarios libres
              </h3>
              {!tieneHorario ? (
                <p className="text-muted-foreground text-sm">
                  {profesional?.nombre ?? 'La profesional'} no tiene horario de atención ese día.
                  Puedes elegir la hora a mano.
                </p>
              ) : horasLibres === null ? (
                <p className="text-muted-foreground text-sm">Buscando horarios libres…</p>
              ) : horasLibres.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No quedan horarios libres para una cita de esta duración ese día.
                </p>
              ) : (
                horasLibres.map(([lugarId, horas]) => (
                  <div key={lugarId} className="flex flex-col gap-1.5">
                    <p className="text-muted-foreground text-sm">{nombreLugar(lugarId)}</p>
                    <div className="flex flex-wrap gap-2">
                      {horas.map((h) => {
                        const texto = formatearHora(h.inicio, ZONA)
                        const elegida = lugarFinal === lugarId && horaFinal === texto
                        return (
                          <button
                            key={texto}
                            type="button"
                            aria-pressed={elegida}
                            onClick={() => cambiar({ hora: texto, lugarId, horaTocada: true })}
                            className={cn(
                              'h-11 rounded-sm border px-3 text-sm tabular-nums transition-colors duration-150',
                              elegida
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border bg-card hover:bg-muted',
                            )}
                          >
                            {texto}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Hora
                <input
                  type="time"
                  required
                  step={300}
                  value={horaFinal}
                  onChange={(e) =>
                    cambiar({ hora: e.target.value, lugarId: lugarFinal, horaTocada: true })
                  }
                  className={claseCampo}
                  aria-describedby={`${ids}-horario`}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Lugar
                <select
                  value={lugarFinal}
                  onChange={(e) =>
                    cambiar({ lugarId: e.target.value, hora: horaFinal, horaTocada: true })
                  }
                  className={claseCampo}
                >
                  {opciones.lugares.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p id={`${ids}-horario`} className="text-muted-foreground -mt-3 text-sm tabular-nums">
              De {horaFinal} a {sumarMinutos(horaFinal, form.duracionMin)}
            </p>

            <label className="flex flex-col gap-1.5 text-sm font-medium">
              {form.modo === 'bloqueo' ? 'Motivo' : 'Nota (opcional)'}
              <textarea
                rows={2}
                value={form.nota}
                placeholder={form.modo === 'bloqueo' ? 'Por ejemplo: trámite en el banco' : ''}
                onChange={(e) => cambiar({ nota: e.target.value })}
                className={cn(claseCampo, 'h-auto py-2')}
              />
            </label>
          </div>

          <SheetFooter className="border-border bg-popover sticky bottom-0 border-t">
            {/* Avisos que no bloquean: banda amarilla y "Agendar igual" (docs/diseno.md). */}
            {avisos.length > 0 && !error && (
              <div className="bg-warning-bg text-warning flex gap-2 rounded-lg px-4 py-3 text-sm">
                <WarningIcon weight="bold" className="mt-0.5 size-4 shrink-0" />
                <ul className="flex flex-col gap-1">
                  {avisos.map((a, i) => (
                    <li key={i}>{textoAviso(a)}</li>
                  ))}
                </ul>
              </div>
            )}
            {error && (
              <p
                role="alert"
                className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
              >
                {error}
              </p>
            )}
            <Button type="submit" size="lg" disabled={guardando}>
              {guardando
                ? 'Guardando…'
                : form.modo === 'bloqueo'
                  ? 'Guardar bloqueo'
                  : `${reagendar ? 'Reagendar' : 'Agendar'}${avisos.length > 0 ? ' igual' : ''}`}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

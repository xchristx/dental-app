import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Enlace } from '@/components/enlace'
import { useIr, useParametro } from '@/lib/navegacion'
import {
  ArrowCounterClockwiseIcon,
  CalendarPlusIcon,
  CheckIcon,
  NotePencilIcon,
  ProhibitIcon,
  UserCheckIcon,
  WarningIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react'
import {
  calcularLlegada,
  enlaceWhatsApp,
  estadoAlReagendar,
  estadosSiguientes,
  impactoDeLlegada,
  mensajeRetraso,
  nombreConEspecialidad,
  fechaEnZona,
  formatearDiaLargo,
  formatearFechaNumerica,
  formatearHora,
  formatearLlegada,
  mensajeRecordatorio,
  puedeEnviarRecordatorio,
  puedeReagendar,
} from '@dental/core'
import { FormularioCita, type DatosReagendar } from '@/components/agenda/agendar-cita'
import { AvisoAlergias } from '@/components/historia/aviso-alergias'
import { FormularioEvolucion, ListaEvoluciones } from '@/components/historia/evolucion'
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
  cambiarEstadoCita,
  corregirLlegada,
  extenderCita,
  guardarTelefono,
  marcarRecordatorioEnviado,
  type ResultadoCita,
} from '@/lib/agenda/acciones'
import type { CitaAgenda, EnlacesReagenda } from '@/lib/agenda/datos'
import type { OpcionesAgendar } from '@/lib/agenda/opciones'
import { ZONA } from '@/lib/agenda/zona'
import { consultaHistoria, type Evolucion } from '@/lib/historia/datos'
import { cn } from '@/lib/utils'

const claseCampo =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

const NOMBRE_ESTADO = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  atendida: 'Atendida',
  no_asistio: 'No asistió',
  cancelada: 'Cancelada',
} as const

const SIN_ENLACES: EnlacesReagenda = { desde: null, hacia: null }

/**
 * Muestra el detalle de la cita de `?cita=<id>`. Se lee en el navegador, con
 * las citas de la semana que ya llegaron con la página: abrir y cerrar el
 * detalle no va al servidor.
 */
export function DetalleSeleccionado({
  citas,
  enlaces,
  opciones,
  fecha,
}: {
  /** Las citas de la semana que se ve. */
  citas: CitaAgenda[]
  enlaces: Record<string, EnlacesReagenda>
  opciones: OpcionesAgendar
  /** El día de la agenda, para volver a él al cerrar. */
  fecha: string
}) {
  const id = useParametro('cita')
  const cita = citas.find((c) => c.id === id)
  if (!cita) return null
  const dia = fechaEnZona(cita.inicio, ZONA)
  return (
    <DetalleCita
      key={cita.id}
      cita={cita}
      citasDelDia={citas.filter((c) => fechaEnZona(c.inicio, ZONA) === dia)}
      enlaces={enlaces[cita.id] ?? SIN_ENLACES}
      opciones={opciones}
      urlCerrar={`/?fecha=${fecha}`}
    />
  )
}

/** Detalle de una cita: datos, estado (0005), recordatorio por WhatsApp y reagendar (0012). */
export function DetalleCita({
  cita,
  citasDelDia,
  enlaces,
  opciones,
  urlCerrar,
}: {
  cita: CitaAgenda
  /** Las citas del mismo día, para ver a quién atrasa una llegada tarde (0013). */
  citasDelDia: CitaAgenda[]
  enlaces: EnlacesReagenda
  opciones: OpcionesAgendar
  urlCerrar: string
}) {
  const ir = useIr()
  const [reagendando, setReagendando] = useState<DatosReagendar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false)
  // Evolución que se está escribiendo (vacía) o corrigiendo (0018).
  const [escribiendo, setEscribiendo] = useState<{ evolucion?: Evolucion } | null>(null)
  // Alergias y evolución del paciente. Es la misma consulta que la de su ficha.
  const historia = useQuery({
    ...consultaHistoria(cita.pacienteId ?? ''),
    enabled: cita.pacienteId !== null,
  })
  const [telefono, setTelefono] = useState(cita.telefono ?? '')
  // El campo muestra la llegada guardada, también justo después de tocar "Llegó".
  const llegadaGuardada = cita.llegada ? formatearHora(cita.llegada, ZONA) : ''
  const [horaLlegada, setHoraLlegada] = useState(llegadaGuardada)
  const [llegadaPrevia, setLlegadaPrevia] = useState(llegadaGuardada)
  if (llegadaPrevia !== llegadaGuardada) {
    setLlegadaPrevia(llegadaGuardada)
    setHoraLlegada(llegadaGuardada)
  }

  const esBloqueo = cita.paciente === null
  // Una cita ya reagendada queda como historial: los cambios se hacen en la nueva.
  const reagendada = enlaces.hacia !== null
  // Los botones dependen de la hora (0013): por ejemplo, "No asistió" recién desde la hora de la cita.
  const ahora = new Date()
  const siguientes = reagendada
    ? []
    : estadosSiguientes(cita.estado, esBloqueo, { inicio: cita.inicio, ahora, zona: ZONA })
  const sePuedeReagendar = puedeReagendar({ estado: cita.estado, esBloqueo }, reagendada)
  const yaNoOcupa = cita.estado === 'no_asistio' || cita.estado === 'cancelada'
  const fecha = fechaEnZona(cita.inicio, ZONA)
  const horario = `${formatearHora(cita.inicio, ZONA)} – ${formatearHora(cita.fin, ZONA)}`
  const puedeRecordar = !esBloqueo && puedeEnviarRecordatorio(cita.estado, cita.inicio, ahora)
  const enlace =
    puedeRecordar && cita.paciente
      ? enlaceWhatsApp(
          cita.telefono,
          mensajeRecordatorio({
            paciente: cita.paciente,
            tipo: cita.tipo,
            lugar: cita.lugar.nombre,
            inicio: cita.inicio,
            zona: ZONA,
          }),
        )
      : null

  function ejecutar(accion: () => Promise<ResultadoCita>) {
    setError(null)
    iniciar(async () => {
      const resultado = await accion()
      if (!resultado.ok) setError(resultado.error)
      else setConfirmarCancelacion(false)
    })
  }

  const cambiarA = (estado: string) => ejecutar(() => cambiarEstadoCita(cita.id, estado))

  function abrirReagendar() {
    if (!cita.paciente) return
    setError(null)
    setReagendando({
      citaId: cita.id,
      paciente: cita.paciente,
      profesionalId: cita.profesionalId,
      lugarId: cita.lugarId,
      tipoCitaId: cita.tipoCitaId,
      // Si se extendió por una llegada tarde, cuenta la duración acordada.
      duracionMin: Math.round(
        ((cita.finPrevisto ?? cita.fin).getTime() - cita.inicio.getTime()) / 60_000,
      ),
      nota: cita.nota,
      inicio: cita.inicio,
      quedaComo: estadoAlReagendar(cita, new Date()),
    })
  }

  // Empieza en el día de la cita, o en hoy si ese día ya pasó.
  const hoy = fechaEnZona(ahora, ZONA)
  const fechaParaReagendar = fecha < hoy ? hoy : fecha
  const botonReagendar = sePuedeReagendar && (
    <Button
      size={yaNoOcupa ? 'lg' : 'default'}
      variant={yaNoOcupa ? 'default' : 'outline'}
      disabled={pendiente}
      onClick={abrirReagendar}
    >
      <CalendarPlusIcon weight="bold" />
      Reagendar
    </Button>
  )

  return (
    <>
      {reagendando && (
        <FormularioCita
          opciones={opciones}
          fecha={fechaParaReagendar}
          abierto
          onOpenChange={(abierto) => !abierto && setReagendando(null)}
          reagendar={reagendando}
          // Se abre el detalle de la cita nueva, para enviarle el recordatorio con la hora nueva.
          onGuardada={(nueva) => void ir(`/?fecha=${nueva.fecha}&cita=${nueva.id}`)}
        />
      )}
      {cita.pacienteId && historia.data && (
        <FormularioEvolucion
          abierto={escribiendo !== null}
          onCerrar={() => setEscribiendo(null)}
          pacienteId={cita.pacienteId}
          organizacionId={historia.data.organizacionId}
          citas={[
            {
              id: cita.id,
              fecha,
              etiqueta: `${formatearFechaNumerica(fecha)} · ${cita.tipo ?? 'Cita'} · ${cita.lugar.nombre}`,
            },
          ]}
          citaId={cita.id}
          evolucion={escribiendo?.evolucion}
        />
      )}
      <Sheet
        open={!reagendando && !escribiendo}
        onOpenChange={(abierto) => {
          // Cerrar solo cambia la URL: los datos ya están en la página.
          if (!abierto) void ir(urlCerrar, { reemplazar: true })
        }}
      >
        <SheetContent aria-busy={pendiente}>
          <SheetHeader>
            <SheetTitle>{esBloqueo ? (cita.nota ?? 'Bloqueo') : cita.paciente}</SheetTitle>
            <SheetDescription className="tabular-nums">
              {formatearDiaLargo(fecha)} · {horario}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-4 py-3 md:px-6">
            {cita.pacienteId && historia.data && (
              <div className="flex flex-col gap-1.5">
                <AvisoAlergias anamnesis={historia.data.anamnesis} />
                <Enlace
                  href={`/pacientes/${cita.pacienteId}`}
                  className="text-muted-foreground hover:text-foreground self-start text-sm underline underline-offset-2"
                >
                  Ver ficha y antecedentes
                </Enlace>
              </div>
            )}

            <dl className="divide-border border-border divide-y rounded-lg border">
              <Dato nombre="Estado">{NOMBRE_ESTADO[cita.estado]}</Dato>
              {!esBloqueo && <Dato nombre="Tipo">{cita.tipo ?? 'Sin tipo'}</Dato>}
              <Dato nombre="Lugar">{cita.lugar.nombre}</Dato>
              <Dato nombre="Profesional">
                {nombreConEspecialidad({
                  nombre: cita.profesional,
                  especialidad: cita.especialidad,
                })}
              </Dato>
              {cita.estado === 'atendida' && cita.llegada && (
                <Dato nombre="Llegada">
                  {formatearHora(cita.llegada, ZONA)} ·{' '}
                  {formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))}
                </Dato>
              )}
              {cita.finPrevisto && (
                <Dato nombre="Fin acordado">
                  {formatearHora(cita.finPrevisto, ZONA)} · se extendió por la llegada tarde
                </Dato>
              )}
              {!esBloqueo && (puedeRecordar || cita.recordatorioEnviado) && (
                <Dato nombre="Recordatorio">
                  {cita.recordatorioEnviado
                    ? `Enviado el ${formatearDiaLargo(fechaEnZona(cita.recordatorioEnviado, ZONA)).toLowerCase()} a las ${formatearHora(cita.recordatorioEnviado, ZONA)}`
                    : 'Todavía no se envió'}
                </Dato>
              )}
              {!esBloqueo && cita.nota && <Dato nombre="Nota">{cita.nota}</Dato>}
              {enlaces.desde && (
                <Dato nombre="Reagendada desde">
                  <EnlaceCita id={enlaces.desde.id} inicio={enlaces.desde.inicio} />
                </Dato>
              )}
              {enlaces.hacia && (
                <Dato nombre="Reagendada para">
                  <EnlaceCita id={enlaces.hacia.id} inicio={enlaces.hacia.inicio} />
                </Dato>
              )}
            </dl>

            {/* Llegó tarde: qué pasa si se atiende completa (0013). */}
            {!reagendada && (
              <AvisoLlegadaTarde
                cita={cita}
                citasDelDia={citasDelDia}
                opciones={opciones}
                ahora={ahora}
                pendiente={pendiente}
                onExtender={() => ejecutar(() => extenderCita(cita.id))}
              />
            )}

            {/* Si no vino o se canceló, lo siguiente es reagendar. */}
            {yaNoOcupa && botonReagendar}

            {/* Lo más frecuente primero: "Llegó" (0005). */}
            {(siguientes.includes('atendida') ||
              siguientes.includes('confirmada') ||
              siguientes.includes('no_asistio') ||
              (!yaNoOcupa && botonReagendar)) && (
              <div className="flex flex-col gap-2">
                {siguientes.includes('atendida') && (
                  <Button size="lg" disabled={pendiente} onClick={() => cambiarA('atendida')}>
                    <UserCheckIcon weight="bold" />
                    Llegó
                  </Button>
                )}
                {(siguientes.includes('confirmada') || siguientes.includes('no_asistio')) && (
                  <div className="grid grid-cols-2 gap-2">
                    {siguientes.includes('confirmada') && (
                      <Button
                        variant="outline"
                        disabled={pendiente}
                        onClick={() => cambiarA('confirmada')}
                      >
                        <CheckIcon weight="bold" />
                        Confirmó
                      </Button>
                    )}
                    {siguientes.includes('no_asistio') && (
                      <Button
                        variant="outline"
                        disabled={pendiente}
                        onClick={() => cambiarA('no_asistio')}
                      >
                        No asistió
                      </Button>
                    )}
                  </div>
                )}
                {botonReagendar}
              </div>
            )}

            {cita.estado === 'atendida' && historia.data && (
              <SeccionEvolucionDeLaCita
                evoluciones={historia.data.evoluciones.filter((e) => e.citaId === cita.id)}
                onEscribir={(evolucion) => setEscribiendo({ evolucion })}
              />
            )}

            {puedeRecordar && (
              <section aria-label="Recordatorio" className="flex flex-col gap-2">
                {enlace ? (
                  <Button asChild variant="outline">
                    {/* El enlace se abre en el mismo toque (si no, el navegador lo bloquea) y
                      después se marca como enviado. */}
                    <a
                      href={enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => ejecutar(() => marcarRecordatorioEnviado(cita.id))}
                    >
                      <WhatsappLogoIcon weight="bold" />
                      {cita.recordatorioEnviado
                        ? 'Enviar otro recordatorio'
                        : 'Enviar recordatorio'}
                    </a>
                  </Button>
                ) : (
                  <form
                    className="flex flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (cita.pacienteId) {
                        const id = cita.pacienteId
                        ejecutar(() => guardarTelefono(id, telefono))
                      }
                    }}
                  >
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      Celular del paciente
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="71234567"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className={claseCampo}
                      />
                    </label>
                    <p className="text-muted-foreground text-sm">
                      Para enviarle un recordatorio por WhatsApp, guarda su celular.
                    </p>
                    <Button type="submit" variant="outline" disabled={pendiente}>
                      Guardar celular
                    </Button>
                  </form>
                )}
              </section>
            )}

            {cita.estado === 'atendida' && (
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  ejecutar(() => corregirLlegada(cita.id, horaLlegada))
                }}
              >
                <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
                  Hora de llegada
                  <input
                    type="time"
                    value={horaLlegada}
                    onChange={(e) => setHoraLlegada(e.target.value)}
                    className={claseCampo}
                  />
                </label>
                <Button type="submit" variant="outline" disabled={pendiente}>
                  Corregir
                </Button>
              </form>
            )}

            {/* Deshacer y cancelar, al final y con menos peso visual. */}
            <div className="flex flex-col gap-2">
              {siguientes.includes('agendada') && (
                <Button variant="ghost" disabled={pendiente} onClick={() => cambiarA('agendada')}>
                  <ArrowCounterClockwiseIcon weight="bold" />
                  {
                    {
                      agendada: '',
                      confirmada: 'Quitar la confirmación',
                      atendida: 'Deshacer «Llegó»',
                      no_asistio: 'Deshacer «No asistió»',
                      cancelada: esBloqueo
                        ? 'Volver a activar el bloqueo'
                        : 'Deshacer la cancelación',
                    }[cita.estado]
                  }
                </Button>
              )}

              {siguientes.includes('cancelada') &&
                (confirmarCancelacion ? (
                  <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                    <p className="text-destructive text-sm">
                      {esBloqueo
                        ? '¿Cancelar el bloqueo? El horario queda libre.'
                        : '¿Cancelar la cita? Queda en el historial como cancelada y el horario queda libre.'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        disabled={pendiente}
                        onClick={() => setConfirmarCancelacion(false)}
                      >
                        No
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={pendiente}
                        onClick={() => cambiarA('cancelada')}
                      >
                        Sí, cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    disabled={pendiente}
                    onClick={() => setConfirmarCancelacion(true)}
                  >
                    <ProhibitIcon weight="bold" />
                    {esBloqueo ? 'Cancelar bloqueo' : 'Cancelar cita'}
                  </Button>
                ))}
            </div>
          </div>

          {error && (
            <SheetFooter className="border-border bg-popover sticky bottom-0 border-t">
              <p
                role="alert"
                className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
              >
                {error}
              </p>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Lo que se hizo en esta cita, o el botón para escribirlo (0018). */
function SeccionEvolucionDeLaCita({
  evoluciones,
  onEscribir,
}: {
  evoluciones: Evolucion[]
  /** Sin argumento, escribe una nueva; con una evolución, la corrige. */
  onEscribir: (evolucion?: Evolucion) => void
}) {
  return (
    <section aria-labelledby="titulo-evolucion-cita" className="flex flex-col gap-2">
      <h3 id="titulo-evolucion-cita" className="font-medium">
        Evolución
      </h3>
      {evoluciones.length > 0 && (
        <ListaEvoluciones evoluciones={evoluciones} onCorregir={onEscribir} />
      )}
      <Button variant="outline" onClick={() => onEscribir()}>
        <NotePencilIcon weight="bold" />
        {evoluciones.length > 0 ? 'Agregar otra' : 'Escribir qué se hizo'}
      </Button>
    </section>
  )
}

function EnlaceCita({ id, inicio }: { id: string; inicio: Date }) {
  const fecha = fechaEnZona(inicio, ZONA)
  return (
    <Enlace href={`/?fecha=${fecha}&cita=${id}`} className="underline underline-offset-4">
      {formatearDiaLargo(fecha)} · {formatearHora(inicio, ZONA)}
    </Enlace>
  )
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className={cn('flex justify-between gap-4 px-3 py-2.5 text-sm')}>
      <dt className="text-muted-foreground shrink-0">{nombre}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

/**
 * Si llegó tarde, a qué hora termina la cita atendida completa y a quién
 * atrasa (0013). La decisión clínica (acortar o atender completo) es de ella:
 * la app solo muestra el efecto y ofrece extender la cita o avisar al
 * siguiente paciente.
 */
function AvisoLlegadaTarde({
  cita,
  citasDelDia,
  opciones,
  ahora,
  pendiente,
  onExtender,
}: {
  cita: CitaAgenda
  citasDelDia: CitaAgenda[]
  opciones: OpcionesAgendar
  ahora: Date
  pendiente: boolean
  onExtender: () => void
}) {
  const [descartado, setDescartado] = useState(false)
  const impacto = impactoDeLlegada(cita, {
    citas: citasDelDia,
    controlaSillon: (id) => opciones.lugares.find((l) => l.id === id)?.controlaSillon ?? false,
    margenTrasladoMin:
      opciones.profesionales.find((p) => p.id === cita.profesionalId)?.margenTrasladoMin ?? 30,
  })
  // Pasada la hora en que terminaría, ya no hay nada que decidir.
  if (descartado || impacto.tipo === 'sin_impacto' || !cita.llegada) return null
  if (ahora >= impacto.finCompleto) return null

  const termina = formatearHora(impacto.finCompleto, ZONA)
  const siguiente =
    impacto.tipo === 'atrasa_siguiente'
      ? citasDelDia.find((c) => c.id === impacto.siguienteId)
      : undefined

  let textoSiguiente = 'Después no tienes otra cita que se atrase.'
  let enlace: string | null = null
  if (impacto.tipo === 'atrasa_siguiente' && siguiente) {
    const hora = formatearHora(siguiente.inicio, ZONA)
    const minutos = `unos ${impacto.minutosRetraso} min tarde`
    const traslado =
      siguiente.profesionalId === cita.profesionalId && siguiente.lugarId !== cita.lugarId
        ? ', contando el traslado'
        : ''
    if (!siguiente.paciente) {
      textoSiguiente = `Tu bloqueo «${siguiente.nota ?? 'Bloqueo'}» de las ${hora} empezaría ${minutos}${traslado}.`
    } else {
      const conQuien =
        siguiente.profesionalId !== cita.profesionalId ? ` con ${siguiente.profesional}` : ''
      textoSiguiente = `La cita de ${siguiente.paciente}${conQuien} a las ${hora} empezaría ${minutos}${traslado}.`
      enlace = enlaceWhatsApp(
        siguiente.telefono,
        mensajeRetraso({
          paciente: siguiente.paciente,
          inicio: siguiente.inicio,
          minutos: impacto.minutosRetraso,
          zona: ZONA,
        }),
      )
    }
  }
  const primerNombre = siguiente?.paciente?.split(' ')[0]

  return (
    <section
      aria-label="Llegada tarde"
      className="bg-warning-bg text-warning flex flex-col gap-3 rounded-lg px-4 py-3 text-sm"
    >
      <div className="flex gap-2">
        <WarningIcon weight="bold" className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">
            {formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))}.
          </p>
          <p>Si la atiendes completa, terminas a las {termina}.</p>
          <p>{textoSiguiente}</p>
          {siguiente?.paciente && !enlace && (
            <p>{primerNombre} no tiene celular guardado para avisarle.</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {impacto.tipo === 'se_puede_extender' && (
          <Button variant="outline" disabled={pendiente} onClick={onExtender}>
            Extender hasta las {termina}
          </Button>
        )}
        {enlace && (
          <Button asChild variant="outline">
            <a href={enlace} target="_blank" rel="noopener noreferrer">
              <WhatsappLogoIcon weight="bold" />
              Avisar a {primerNombre}
            </a>
          </Button>
        )}
        <Button variant="ghost" disabled={pendiente} onClick={() => setDescartado(true)}>
          Mantener el horario
        </Button>
      </div>
    </section>
  )
}

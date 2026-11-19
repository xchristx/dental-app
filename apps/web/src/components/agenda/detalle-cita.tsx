'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowCounterClockwiseIcon,
  CalendarPlusIcon,
  CheckIcon,
  ProhibitIcon,
  UserCheckIcon,
  WhatsappLogoIcon,
} from '@phosphor-icons/react'
import {
  calcularLlegada,
  enlaceWhatsApp,
  estadoAlReagendar,
  estadosSiguientes,
  fechaEnZona,
  formatearDiaLargo,
  formatearHora,
  formatearLlegada,
  mensajeRecordatorio,
  puedeReagendar,
} from '@dental/core'
import { FormularioCita, type DatosReagendar } from '@/components/agenda/agendar-cita'
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
  guardarTelefono,
  marcarRecordatorioEnviado,
  type ResultadoCita,
} from '@/lib/agenda/acciones'
import type { CitaAgenda, EnlacesReagenda } from '@/lib/agenda/datos'
import type { OpcionesAgendar } from '@/lib/agenda/opciones'
import { ZONA } from '@/lib/agenda/zona'
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

/** Detalle de una cita: datos, estado (0005), recordatorio por WhatsApp y reagendar (0012). */
export function DetalleCita({
  cita,
  enlaces,
  opciones,
  urlCerrar,
}: {
  cita: CitaAgenda
  enlaces: EnlacesReagenda
  opciones: OpcionesAgendar
  urlCerrar: string
}) {
  const router = useRouter()
  const [reagendando, setReagendando] = useState<DatosReagendar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false)
  const [telefono, setTelefono] = useState(cita.telefono ?? '')
  const [horaLlegada, setHoraLlegada] = useState(
    cita.llegada ? formatearHora(cita.llegada, ZONA) : '',
  )

  const esBloqueo = cita.paciente === null
  // Una cita ya reagendada queda como historial: los cambios se hacen en la nueva.
  const reagendada = enlaces.hacia !== null
  const siguientes = reagendada ? [] : estadosSiguientes(cita.estado, esBloqueo)
  const sePuedeReagendar = puedeReagendar({ estado: cita.estado, esBloqueo }, reagendada)
  const yaNoOcupa = cita.estado === 'no_asistio' || cita.estado === 'cancelada'
  const fecha = fechaEnZona(cita.inicio, ZONA)
  const horario = `${formatearHora(cita.inicio, ZONA)} – ${formatearHora(cita.fin, ZONA)}`
  const puedeRecordar = !esBloqueo && (cita.estado === 'agendada' || cita.estado === 'confirmada')
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
      duracionMin: Math.round((cita.fin.getTime() - cita.inicio.getTime()) / 60_000),
      nota: cita.nota,
      inicio: cita.inicio,
      quedaComo: estadoAlReagendar(cita, new Date()),
    })
  }

  // Empieza en el día de la cita, o en hoy si ese día ya pasó.
  const hoy = fechaEnZona(new Date(), ZONA)
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
          onGuardada={(nueva) =>
            router.push(`/?fecha=${nueva.fecha}&cita=${nueva.id}`, { scroll: false })
          }
        />
      )}
      <Sheet
        open={!reagendando}
        onOpenChange={(abierto) => {
          if (!abierto) router.replace(urlCerrar, { scroll: false })
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
            <dl className="divide-border border-border divide-y rounded-lg border">
              <Dato nombre="Estado">{NOMBRE_ESTADO[cita.estado]}</Dato>
              {!esBloqueo && <Dato nombre="Tipo">{cita.tipo ?? 'Sin tipo'}</Dato>}
              <Dato nombre="Lugar">{cita.lugar.nombre}</Dato>
              <Dato nombre="Profesional">{cita.profesional}</Dato>
              {cita.estado === 'atendida' && cita.llegada && (
                <Dato nombre="Llegada">
                  {formatearHora(cita.llegada, ZONA)} ·{' '}
                  {formatearLlegada(calcularLlegada(cita.inicio, cita.llegada))}
                </Dato>
              )}
              {!esBloqueo && (
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

            {/* Si no vino o se canceló, lo siguiente es reagendar. */}
            {yaNoOcupa && botonReagendar}

            {/* Lo más frecuente primero: "Llegó" (0005). */}
            {(siguientes.includes('atendida') ||
              siguientes.includes('confirmada') ||
              siguientes.includes('no_asistio')) && (
              <div className="flex flex-col gap-2">
                {siguientes.includes('atendida') && (
                  <Button size="lg" disabled={pendiente} onClick={() => cambiarA('atendida')}>
                    <UserCheckIcon weight="bold" />
                    Llegó
                  </Button>
                )}
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
                {botonReagendar}
              </div>
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

function EnlaceCita({ id, inicio }: { id: string; inicio: Date }) {
  const fecha = fechaEnZona(inicio, ZONA)
  return (
    <Link
      href={`/?fecha=${fecha}&cita=${id}`}
      scroll={false}
      className="underline underline-offset-4"
    >
      {formatearDiaLargo(fecha)} · {formatearHora(inicio, ZONA)}
    </Link>
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

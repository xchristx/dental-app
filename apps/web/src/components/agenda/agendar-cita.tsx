'use client'

import { useId, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlusIcon, UserPlusIcon, XIcon } from '@phosphor-icons/react'
import type { Fecha } from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { agendarCita } from '@/lib/agenda/acciones'
import type { OpcionesAgendar } from '@/lib/agenda/opciones'
import { cn } from '@/lib/utils'

const DURACIONES = [15, 30, 45, 60, 90, 120, 150, 180]

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
  duracionMin: number
  nota: string
}

function formularioInicial(opciones: OpcionesAgendar, fecha: Fecha): Formulario {
  const tipo = opciones.tiposCita[0]
  return {
    id: crypto.randomUUID(),
    modo: 'paciente',
    pacienteId: null,
    pacienteNuevo: null,
    busqueda: '',
    profesionalId: opciones.profesionalPropia ?? opciones.profesionales[0]?.id ?? '',
    lugarId: opciones.lugares[0]?.id ?? '',
    tipoCitaId: tipo?.id ?? '',
    fecha,
    hora: '10:00',
    duracionMin: tipo?.duracionMin ?? 60,
    nota: '',
  }
}

// Para buscar "Lucia" y encontrar "Lucía".
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

function sumarMinutos(hora: string, minutos: number) {
  const [h = 0, m = 0] = hora.split(':').map(Number)
  const total = (h * 60 + m + minutos) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** Botones "Agendar" (fijo abajo en el celular, en el encabezado desde tablet) y su formulario. */
export function AgendarCita({ opciones, fecha }: { opciones: OpcionesAgendar; fecha: Fecha }) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(() => formularioInicial(opciones, fecha))
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciarGuardado] = useTransition()
  const router = useRouter()
  const ids = useId()

  function abrir() {
    setForm(formularioInicial(opciones, fecha))
    setError(null)
    setAbierto(true)
  }

  // Al cambiar algo, el aviso anterior ya no aplica.
  const cambiar = (cambios: Partial<Formulario>) => {
    setError(null)
    setForm((f) => ({ ...f, ...cambios }))
  }

  const coincidencias = useMemo(() => {
    const buscado = normalizar(form.busqueda)
    if (buscado.length < 2) return []
    return opciones.pacientes.filter((p) => normalizar(p.nombre).includes(buscado)).slice(0, 6)
  }, [form.busqueda, opciones.pacientes])

  const pacienteElegido = opciones.pacientes.find((p) => p.id === form.pacienteId)
  const duraciones = DURACIONES.includes(form.duracionMin)
    ? DURACIONES
    : [...DURACIONES, form.duracionMin].sort((a, b) => a - b)

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setError(null)

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
        lugarId: form.lugarId,
        tipoCitaId: form.modo === 'bloqueo' ? null : form.tipoCitaId || null,
        fecha: form.fecha,
        hora: form.hora,
        duracionMin: form.duracionMin,
        nota: form.nota,
      })
      if (!resultado.ok) {
        setError(resultado.error)
        return
      }
      setAbierto(false)
      if (resultado.fecha !== fecha) router.push(`/?fecha=${resultado.fecha}`)
    })
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

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent>
          <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
            <SheetHeader>
              <SheetTitle>{form.modo === 'bloqueo' ? 'Nuevo bloqueo' : 'Nueva cita'}</SheetTitle>
              <SheetDescription>
                {form.modo === 'bloqueo'
                  ? 'Un tiempo en que no atiendes: un trámite, la clínica, un viaje.'
                  : 'Si el horario choca con otra cita, te avisamos al guardar.'}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
              {/* Cita o bloqueo */}
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

              {form.modo === 'paciente' && (
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
                      {form.busqueda.trim().length >= 2 && (
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

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Fecha
                  <input
                    type="date"
                    required
                    value={form.fecha}
                    onChange={(e) => cambiar({ fecha: e.target.value })}
                    className={claseCampo}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Hora
                  <input
                    type="time"
                    required
                    step={300}
                    value={form.hora}
                    onChange={(e) => cambiar({ hora: e.target.value })}
                    className={claseCampo}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Duración
                <select
                  value={form.duracionMin}
                  onChange={(e) => cambiar({ duracionMin: Number(e.target.value) })}
                  className={claseCampo}
                  aria-describedby={`${ids}-horario`}
                >
                  {duraciones.map((min) => (
                    <option key={min} value={min}>
                      {min < 60
                        ? `${min} min`
                        : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`}
                    </option>
                  ))}
                </select>
                <span
                  id={`${ids}-horario`}
                  className="text-muted-foreground font-normal tabular-nums"
                >
                  De {form.hora} a {sumarMinutos(form.hora, form.duracionMin)}
                </span>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Lugar
                <select
                  value={form.lugarId}
                  onChange={(e) => cambiar({ lugarId: e.target.value })}
                  className={claseCampo}
                >
                  {opciones.lugares.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {opciones.profesionales.length > 1 && (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Profesional
                  <select
                    value={form.profesionalId}
                    onChange={(e) => cambiar({ profesionalId: e.target.value })}
                    className={claseCampo}
                  >
                    {opciones.profesionales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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
              {error && (
                <p
                  role="alert"
                  className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm"
                >
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" disabled={guardando}>
                {guardando ? 'Guardando…' : form.modo === 'bloqueo' ? 'Guardar bloqueo' : 'Agendar'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}

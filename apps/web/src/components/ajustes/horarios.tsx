import { useState, useTransition } from 'react'
import { PlusIcon, XIcon } from '@phosphor-icons/react'
import { NOMBRES_DIAS } from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { agregarTramos, guardarMargenTraslado, quitarTramo } from '@/lib/ajustes/acciones'
import type { DatosAjustes } from '@/lib/ajustes/datos'
import { cn } from '@/lib/utils'
import { COLOR, claseCampo } from './colores'

const DIAS = [1, 2, 3, 4, 5, 6, 7]
const INICIAL_DIA: Record<number, string> = {
  1: 'L',
  2: 'M',
  3: 'M',
  4: 'J',
  5: 'V',
  6: 'S',
  7: 'D',
}
const MARGENES = [0, 15, 30, 45, 60, 90]

interface FormTramo {
  dias: number[]
  horaInicio: string
  horaFin: string
  lugarId: string
}

/** Horarios de atención por día y lugar (0004), y el tiempo de traslado. */
export function Horarios({ datos }: { datos: DatosAjustes }) {
  const { lugares, tramos } = datos
  // Una socia solo carga sus propios horarios (0014).
  const profesionales = datos.esAdmin
    ? datos.profesionales
    : datos.profesionales.filter((p) => p.id === datos.profesionalPropia)
  const [elegida, setProfesionalId] = useState(
    datos.profesionalPropia ?? profesionales[0]?.id ?? '',
  )
  // Si la elegida se dio de baja, se pasa a la primera de la lista.
  const profesionalId = profesionales.some((p) => p.id === elegida)
    ? elegida
    : (profesionales[0]?.id ?? '')
  const [form, setForm] = useState<FormTramo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorLista, setErrorLista] = useState<string | null>(null)
  const [pendiente, iniciar] = useTransition()

  const profesional = profesionales.find((p) => p.id === profesionalId)
  const suyos = tramos.filter((t) => t.profesionalId === profesionalId)
  const lugar = (id: string) => lugares.find((l) => l.id === id)

  function abrir() {
    setError(null)
    setForm({ dias: [], horaInicio: '10:00', horaFin: '13:00', lugarId: lugares[0]?.id ?? '' })
  }

  const cambiar = (cambios: Partial<FormTramo>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function alternarDia(dia: number) {
    if (!form) return
    cambiar({
      dias: form.dias.includes(dia) ? form.dias.filter((d) => d !== dia) : [...form.dias, dia],
    })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await agregarTramos({ profesionalId, ...form })
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  function quitar(id: string) {
    setErrorLista(null)
    iniciar(async () => {
      const r = await quitarTramo(id)
      if (!r.ok) setErrorLista(r.error)
    })
  }

  function cambiarMargen(minutos: number) {
    setErrorLista(null)
    iniciar(async () => {
      const r = await guardarMargenTraslado(profesionalId, minutos)
      if (!r.ok) setErrorLista(r.error)
    })
  }

  return (
    <section aria-labelledby="titulo-horarios" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-horarios" className="text-lg font-medium">
          Horarios de atención
        </h2>
        <p className="text-muted-foreground text-sm">
          Cuándo y dónde atiendes. Con esto la agenda sugiere horarios libres. Los cambios valen
          desde hoy: las semanas pasadas conservan el horario que tenían.
        </p>
      </div>

      {profesionales.length > 1 && (
        <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
          Horario de
          <select
            value={profesionalId}
            onChange={(e) => {
              setErrorLista(null)
              setProfesionalId(e.target.value)
            }}
            className={claseCampo}
          >
            {profesionales.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <ul
        aria-busy={pendiente}
        className="border-border bg-card divide-border divide-y rounded-lg border"
      >
        {DIAS.map((dia) => {
          const delDia = suyos.filter((t) => t.diaSemana === dia)
          return (
            <li key={dia} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center">
              <p className="w-28 shrink-0 font-medium">{NOMBRES_DIAS[dia]}</p>
              {delDia.length === 0 ? (
                <p className="text-muted-foreground text-sm">No atiendes</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {delDia.map((t) => {
                    const l = lugar(t.lugarId)
                    const texto = `${t.horaInicio} – ${t.horaFin} · ${l?.nombre ?? 'Lugar'}`
                    return (
                      <li
                        key={t.id}
                        className={cn(
                          'flex items-center gap-1 rounded-sm py-1 pl-3 text-sm tabular-nums',
                          l ? COLOR[l.color].fondo : 'bg-muted',
                        )}
                      >
                        {texto}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="pointer-coarse:size-11"
                          aria-label={`Quitar ${NOMBRES_DIAS[dia]} ${texto}`}
                          disabled={pendiente}
                          onClick={() => quitar(t.id)}
                        >
                          <XIcon weight="bold" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {errorLista && (
        <p role="alert" className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm">
          {errorLista}
        </p>
      )}

      {lugares.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Para cargar horarios, primero agrega un lugar de trabajo.
        </p>
      ) : (
        <Button variant="outline" className="self-start" onClick={abrir}>
          <PlusIcon weight="bold" />
          Agregar horario
        </Button>
      )}

      {profesional && (
        <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium">
          Tiempo para trasladarse entre lugares
          <select
            value={profesional.margenTrasladoMin}
            disabled={pendiente}
            onChange={(e) => cambiarMargen(Number(e.target.value))}
            className={claseCampo}
          >
            {[...new Set([...MARGENES, profesional.margenTrasladoMin])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? 'Sin margen' : `${m} min`}
                </option>
              ))}
          </select>
          <span className="text-muted-foreground font-normal">
            La agenda avisa si entre dos citas en lugares distintos queda menos que esto.
          </span>
        </label>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>Agregar horario</SheetTitle>
                <SheetDescription>
                  {profesionales.length > 1 && profesional ? `${profesional.nombre}. ` : ''}
                  Puedes elegir varios días con el mismo horario.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-sm font-medium">Días</legend>
                  <div className="grid grid-cols-7 gap-1">
                    {DIAS.map((dia) => (
                      <button
                        key={dia}
                        type="button"
                        aria-pressed={form.dias.includes(dia)}
                        aria-label={NOMBRES_DIAS[dia]}
                        onClick={() => alternarDia(dia)}
                        className={cn(
                          'h-11 rounded-sm border text-sm font-medium transition-colors duration-150',
                          form.dias.includes(dia)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-card hover:bg-muted',
                        )}
                      >
                        {INICIAL_DIA[dia]}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="self-start"
                    onClick={() => cambiar({ dias: [1, 2, 3, 4, 5] })}
                  >
                    Lunes a viernes
                  </Button>
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Desde
                    <input
                      type="time"
                      step={900}
                      value={form.horaInicio}
                      onChange={(e) => cambiar({ horaInicio: e.target.value })}
                      className={claseCampo}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Hasta
                    <input
                      type="time"
                      step={900}
                      value={form.horaFin}
                      onChange={(e) => cambiar({ horaFin: e.target.value })}
                      className={claseCampo}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Lugar
                  <select
                    value={form.lugarId}
                    onChange={(e) => cambiar({ lugarId: e.target.value })}
                    className={claseCampo}
                  >
                    {lugares.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
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
                <Button type="submit" size="lg" disabled={pendiente}>
                  {pendiente ? 'Guardando…' : 'Guardar horario'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

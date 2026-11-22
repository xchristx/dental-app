import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { evolucionEditable, fechaEnZona, formatearFechaNumerica } from '@dental/core'
import { Enlace } from '@/components/enlace'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ZONA } from '@/lib/agenda/zona'
import { borrarEvolucion, guardarEvolucion } from '@/lib/historia/acciones'
import { consultaUsuario, type Evolucion } from '@/lib/historia/datos'
import { claseAreaTexto, claseCampo } from './campos'

/** Una cita del paciente a la que se puede ligar una evolución. */
export interface OpcionCita {
  id: string
  fecha: string
  etiqueta: string
}

/** Lo que se hizo en cada cita (0018), de lo más nuevo a lo más viejo. */
export function SeccionEvolucion({
  pacienteId,
  organizacionId,
  evoluciones,
  citas,
}: {
  pacienteId: string
  organizacionId: string
  evoluciones: Evolucion[]
  /** Citas atendidas del paciente, de la más nueva a la más vieja. */
  citas: OpcionCita[]
}) {
  const [abierto, setAbierto] = useState<{ evolucion?: Evolucion } | null>(null)
  const fechaDeCita = new Map(citas.map((c) => [c.id, c.fecha]))

  return (
    <section aria-labelledby="titulo-evolucion" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-evolucion" className="text-lg font-medium">
          Evolución
        </h2>
        <Button variant="outline" onClick={() => setAbierto({})}>
          <PlusIcon weight="bold" />
          Agregar
        </Button>
      </div>

      {evoluciones.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Todavía no hay nada escrito. Anota aquí lo que se hizo en cada cita.
        </p>
      ) : (
        <ListaEvoluciones
          evoluciones={evoluciones}
          onCorregir={(evolucion) => setAbierto({ evolucion })}
          enlaceCita={(id) => {
            const fecha = fechaDeCita.get(id)
            return fecha ? `/?fecha=${fecha}&cita=${id}` : null
          }}
        />
      )}

      <FormularioEvolucion
        abierto={abierto !== null}
        onCerrar={() => setAbierto(null)}
        pacienteId={pacienteId}
        organizacionId={organizacionId}
        citas={citas}
        evolucion={abierto?.evolucion}
      />
    </section>
  )
}

/** Entradas de la evolución. Las del mismo día y propias se pueden corregir. */
export function ListaEvoluciones({
  evoluciones,
  onCorregir,
  enlaceCita,
}: {
  evoluciones: Evolucion[]
  onCorregir: (evolucion: Evolucion) => void
  /** URL de la cita de la entrada, si se muestra el enlace. */
  enlaceCita?: (citaId: string) => string | null
}) {
  const usuario = useQuery(consultaUsuario())
  const ahora = new Date()
  return (
    <ul className="border-border bg-card divide-border divide-y rounded-lg border">
      {evoluciones.map((e) => {
        const url = e.citaId && enlaceCita ? enlaceCita(e.citaId) : null
        const editable = evolucionEditable(e, usuario.data ?? null, ahora)
        return (
          <li key={e.id} className="flex flex-col gap-1 px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground tabular-nums">
                {formatearFechaNumerica(e.fecha)}
                {e.profesional && ` · ${e.profesional}`}
                {url && (
                  <>
                    {' · '}
                    <Enlace href={url} className="text-foreground underline underline-offset-2">
                      Ver cita
                    </Enlace>
                  </>
                )}
              </p>
              {editable && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="-my-1"
                  onClick={() => onCorregir(e)}
                  aria-label={`Corregir la evolución del ${formatearFechaNumerica(e.fecha)}`}
                >
                  <PencilSimpleIcon weight="bold" />
                  Corregir
                </Button>
              )}
            </div>
            <p className="whitespace-pre-wrap">{e.texto}</p>
          </li>
        )
      })}
    </ul>
  )
}

interface Form {
  id: string
  citaId: string
  fecha: string
  texto: string
}

/**
 * Panel para escribir una evolución nueva o corregir una del mismo día
 * (`evolucion`). Con `citaId` queda ligada a esa cita.
 */
export function FormularioEvolucion({
  abierto,
  onCerrar,
  pacienteId,
  organizacionId,
  citas,
  evolucion,
  citaId,
}: {
  abierto: boolean
  onCerrar: () => void
  pacienteId: string
  organizacionId: string
  citas: OpcionCita[]
  evolucion?: Evolucion
  citaId?: string
}) {
  const [form, setForm] = useState<Form | null>(null)
  const [abiertoPrevio, setAbiertoPrevio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [pendiente, iniciar] = useTransition()
  const hoy = fechaEnZona(new Date(), ZONA)

  // Al abrir, el formulario empieza con la entrada a corregir o vacío.
  if (abierto !== abiertoPrevio) {
    setAbiertoPrevio(abierto)
    if (abierto) {
      const cita = citas.find((c) => c.id === (evolucion?.citaId ?? citaId))
      setError(null)
      setConfirmarBorrado(false)
      setForm({
        id: evolucion?.id ?? crypto.randomUUID(),
        citaId: cita?.id ?? '',
        fecha: evolucion?.fecha ?? cita?.fecha ?? hoy,
        texto: evolucion?.texto ?? '',
      })
    }
  }

  const cambiar = (cambios: Partial<Form>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await guardarEvolucion(
        { ...form, pacienteId, citaId: form.citaId || null },
        organizacionId,
        !evolucion,
      )
      if (r.ok) onCerrar()
      else setError(r.error)
    })
  }

  function borrar() {
    if (!evolucion) return
    iniciar(async () => {
      const r = await borrarEvolucion(evolucion.id)
      if (r.ok) onCerrar()
      else setError(r.error)
    })
  }

  return (
    <Sheet open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent aria-busy={pendiente}>
        {form && (
          <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
            <SheetHeader>
              <SheetTitle>{evolucion ? 'Corregir evolución' : 'Nueva evolución'}</SheetTitle>
              <SheetDescription>
                Se puede corregir o borrar solo hoy. Después, para aclarar algo, se agrega otra.
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
              {citas.length > 0 && (
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Cita (opcional)
                  <select
                    value={form.citaId}
                    onChange={(e) => {
                      const cita = citas.find((c) => c.id === e.target.value)
                      cambiar({ citaId: e.target.value, ...(cita && { fecha: cita.fecha }) })
                    }}
                    className={claseCampo}
                  >
                    <option value="">Sin cita</option>
                    {citas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Fecha
                <input
                  type="date"
                  max={hoy}
                  value={form.fecha}
                  onChange={(e) => cambiar({ fecha: e.target.value })}
                  className={claseCampo}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Qué se hizo
                <textarea
                  value={form.texto}
                  onChange={(e) => cambiar({ texto: e.target.value })}
                  placeholder="Por ejemplo: obturación OM en 36 con resina A2."
                  className={claseAreaTexto}
                />
              </label>

              {evolucion &&
                (confirmarBorrado ? (
                  <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                    <p className="text-destructive text-sm">¿Borrar esta evolución?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={pendiente}
                        onClick={() => setConfirmarBorrado(false)}
                      >
                        No
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={pendiente}
                        onClick={borrar}
                      >
                        Sí, borrar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive self-start"
                    disabled={pendiente}
                    onClick={() => setConfirmarBorrado(true)}
                  >
                    <TrashIcon weight="bold" />
                    Borrar evolución
                  </Button>
                ))}
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
                {pendiente ? 'Guardando…' : 'Guardar evolución'}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}

import { useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react'
import { fechaEnZona, formatearFechaNumerica, nombreConEspecialidad } from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { opcionesParaAgendar } from '@/lib/agenda/opciones'
import { ZONA } from '@/lib/agenda/zona'
import { borrarDerivacion, guardarDerivacion } from '@/lib/historia/acciones'
import type { Derivacion } from '@/lib/historia/datos'
import { cn } from '@/lib/utils'
import { claseAreaTexto, claseCampo } from './campos'

const AFUERA = 'afuera'

const SENTIDOS = [
  { valor: 'recibida', texto: 'Derivado por' },
  { valor: 'enviada', texto: 'Derivado a' },
] as const

interface Form {
  id: string
  sentido: 'recibida' | 'enviada'
  /** Id de una profesional, o AFUERA. */
  quien: string
  contacto: string
  motivo: string
  fecha: string
}

/** Quién mandó al paciente y a quién se lo mandó (0019). */
export function SeccionDerivaciones({
  pacienteId,
  organizacionId,
  derivaciones,
}: {
  pacienteId: string
  organizacionId: string
  derivaciones: Derivacion[]
}) {
  // Las profesionales de la organización. Es la misma consulta de "Agendar".
  const opciones = useQuery({ queryKey: ['opciones'], queryFn: opcionesParaAgendar })
  const profesionales = opciones.data?.profesionales ?? []
  const [form, setForm] = useState<Form | null>(null)
  const [editando, setEditando] = useState<Derivacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmarBorrado, setConfirmarBorrado] = useState(false)
  const [pendiente, iniciar] = useTransition()
  const hoy = fechaEnZona(new Date(), ZONA)

  function abrir(derivacion?: Derivacion) {
    setError(null)
    setConfirmarBorrado(false)
    setEditando(derivacion ?? null)
    setForm({
      id: derivacion?.id ?? crypto.randomUUID(),
      sentido: derivacion?.sentido ?? 'recibida',
      quien: derivacion ? (derivacion.profesionalId ?? AFUERA) : AFUERA,
      contacto: derivacion?.contacto ?? '',
      motivo: derivacion?.motivo ?? '',
      fecha: derivacion?.fecha ?? hoy,
    })
  }

  const cambiar = (cambios: Partial<Form>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    const afuera = form.quien === AFUERA
    iniciar(async () => {
      const r = await guardarDerivacion(
        {
          id: form.id,
          pacienteId,
          sentido: form.sentido,
          profesionalId: afuera ? null : form.quien,
          contacto: afuera ? form.contacto : null,
          motivo: form.motivo,
          fecha: form.fecha,
        },
        organizacionId,
        !editando,
      )
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  function borrar() {
    if (!editando) return
    iniciar(async () => {
      const r = await borrarDerivacion(editando.id)
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  return (
    <section aria-labelledby="titulo-derivaciones" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-derivaciones" className="text-lg font-medium">
          Derivaciones
        </h2>
        <Button variant="outline" onClick={() => abrir()}>
          <PlusIcon weight="bold" />
          Agregar
        </Button>
      </div>

      {derivaciones.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin derivaciones. Anota quién te lo mandó o a quién lo mandaste.
        </p>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {derivaciones.map((d) => (
            <li key={d.id} className="flex items-start gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p>
                  <span className="text-muted-foreground">
                    {d.sentido === 'recibida' ? 'Derivado por' : 'Derivado a'}
                  </span>{' '}
                  <span className="font-medium">{d.quien}</span>
                </p>
                <p className="text-muted-foreground tabular-nums">
                  {formatearFechaNumerica(d.fecha)}
                  {d.motivo && ` · ${d.motivo}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="-my-1"
                onClick={() => abrir(d)}
                aria-label={`Corregir la derivación del ${formatearFechaNumerica(d.fecha)}`}
              >
                <PencilSimpleIcon weight="bold" />
                Corregir
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent aria-busy={pendiente}>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>{editando ? 'Corregir derivación' : 'Nueva derivación'}</SheetTitle>
                <SheetDescription>
                  Quién mandó al paciente o a quién se lo mandaste.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <fieldset className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-sm font-medium">Sentido</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {SENTIDOS.map(({ valor, texto }) => (
                      <label
                        key={valor}
                        className={cn(
                          'border-input flex h-11 cursor-pointer items-center justify-center rounded-sm border text-sm transition-colors duration-150',
                          'has-[:focus-visible]:ring-ring/40 has-[:focus-visible]:ring-3',
                          form.sentido === valor
                            ? 'bg-primary text-primary-foreground border-primary font-medium'
                            : 'bg-card hover:bg-muted',
                        )}
                      >
                        <input
                          type="radio"
                          name="sentido"
                          value={valor}
                          checked={form.sentido === valor}
                          onChange={() => cambiar({ sentido: valor })}
                          className="sr-only"
                        />
                        {texto}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  {form.sentido === 'recibida' ? 'Quién lo derivó' : 'A quién'}
                  <select
                    value={form.quien}
                    onChange={(e) => cambiar({ quien: e.target.value })}
                    className={claseCampo}
                  >
                    {profesionales.map((p) => (
                      <option key={p.id} value={p.id}>
                        {nombreConEspecialidad(p)}
                      </option>
                    ))}
                    <option value={AFUERA}>Alguien de afuera</option>
                  </select>
                </label>

                {form.quien === AFUERA && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Nombre
                    <input
                      value={form.contacto}
                      autoComplete="off"
                      placeholder="Dr. Ramiro Soliz, implantólogo"
                      onChange={(e) => cambiar({ contacto: e.target.value })}
                      className={claseCampo}
                    />
                  </label>
                )}

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Motivo (opcional)
                  <textarea
                    value={form.motivo}
                    placeholder="Por ejemplo: endodoncia en 46."
                    onChange={(e) => cambiar({ motivo: e.target.value })}
                    className={claseAreaTexto}
                  />
                </label>

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

                {editando &&
                  (confirmarBorrado ? (
                    <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                      <p className="text-destructive text-sm">¿Borrar esta derivación?</p>
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
                      Borrar derivación
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
                  {pendiente ? 'Guardando…' : 'Guardar derivación'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

import { useState, useTransition } from 'react'
import { useIr } from '@/lib/navegacion'
import { PencilSimpleIcon, UserPlusIcon } from '@phosphor-icons/react'
import { fechaEnZona } from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { guardarPaciente } from '@/lib/pacientes/acciones'
import type { PacienteLista } from '@/lib/pacientes/datos'
import { ZONA } from '@/lib/agenda/zona'

const claseCampo =
  'border-input bg-card h-11 w-full rounded-sm border px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/40'

interface Form {
  id: string
  nombre: string
  telefono: string
  fechaNacimiento: string
}

/**
 * Botón y panel para crear un paciente (sin `paciente`) o editar su ficha.
 * Un paciente nuevo lleva a su ficha al guardarse.
 */
export function FormularioPaciente({ paciente }: { paciente?: PacienteLista }) {
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()
  const ir = useIr()
  const esNuevo = !paciente

  function abrir() {
    setError(null)
    setForm({
      id: paciente?.id ?? crypto.randomUUID(),
      nombre: paciente?.nombre ?? '',
      telefono: paciente?.telefono ?? '',
      fechaNacimiento: paciente?.fechaNacimiento ?? '',
    })
  }

  const cambiar = (cambios: Partial<Form>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await guardarPaciente(form)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setForm(null)
      if (esNuevo) void ir(`/pacientes/${r.id}`)
    })
  }

  return (
    <>
      {esNuevo ? (
        <Button onClick={abrir}>
          <UserPlusIcon weight="bold" />
          Agregar paciente
        </Button>
      ) : (
        <Button variant="outline" onClick={abrir}>
          <PencilSimpleIcon weight="bold" />
          Editar
        </Button>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>{esNuevo ? 'Nuevo paciente' : 'Editar paciente'}</SheetTitle>
                <SheetDescription>
                  Los antecedentes y el odontograma llegan con la historia clínica.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nombre y apellido
                  <input
                    value={form.nombre}
                    autoComplete="off"
                    onChange={(e) => cambiar({ nombre: e.target.value })}
                    className={claseCampo}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Celular (opcional)
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="71234567"
                    value={form.telefono}
                    onChange={(e) => cambiar({ telefono: e.target.value })}
                    className={claseCampo}
                  />
                  <span className="text-muted-foreground font-normal">
                    Para enviarle recordatorios por WhatsApp.
                  </span>
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Fecha de nacimiento (opcional)
                  <input
                    type="date"
                    // No puede ser futura (0013).
                    max={fechaEnZona(new Date(), ZONA)}
                    value={form.fechaNacimiento}
                    onChange={(e) => cambiar({ fechaNacimiento: e.target.value })}
                    className={claseCampo}
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
                  {guardando ? 'Guardando…' : 'Guardar paciente'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

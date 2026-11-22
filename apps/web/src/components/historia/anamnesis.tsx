import { useState, useTransition } from 'react'
import { NotePencilIcon } from '@phosphor-icons/react'
import { fechaEnZona, formatearFechaNumerica } from '@dental/core'
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
import { guardarAnamnesis } from '@/lib/historia/acciones'
import type { Anamnesis } from '@/lib/historia/datos'
import { claseAreaTexto } from './campos'

interface Form {
  id: string
  antecedentesPersonales: string
  antecedentesFamiliares: string
  alergias: string
  sinAlergias: boolean
  medicamentos: string
}

const SECCIONES = [
  { campo: 'antecedentesPersonales', titulo: 'Antecedentes personales' },
  { campo: 'antecedentesFamiliares', titulo: 'Antecedentes familiares' },
  { campo: 'alergias', titulo: 'Alergias' },
  { campo: 'medicamentos', titulo: 'Medicamentos' },
] as const

/** Anamnesis vigente del paciente y el panel para actualizarla (0018). */
export function SeccionAnamnesis({
  pacienteId,
  organizacionId,
  anamnesis,
}: {
  pacienteId: string
  organizacionId: string
  anamnesis: Anamnesis | null
}) {
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()

  function abrir() {
    setError(null)
    // Cada vez que se guarda es una versión nueva, con su propio id.
    setForm({
      id: crypto.randomUUID(),
      antecedentesPersonales: anamnesis?.antecedentesPersonales ?? '',
      antecedentesFamiliares: anamnesis?.antecedentesFamiliares ?? '',
      alergias: anamnesis?.alergias ?? '',
      sinAlergias: anamnesis?.sinAlergias ?? false,
      medicamentos: anamnesis?.medicamentos ?? '',
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
      const r = await guardarAnamnesis({ ...form, pacienteId }, organizacionId)
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  return (
    <section aria-labelledby="titulo-anamnesis" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-anamnesis" className="text-lg font-medium">
          Anamnesis
        </h2>
        <Button variant="outline" onClick={abrir}>
          <NotePencilIcon weight="bold" />
          {anamnesis ? 'Actualizar' : 'Cargar anamnesis'}
        </Button>
      </div>

      {anamnesis ? (
        <>
          <dl className="border-border bg-card divide-border divide-y rounded-lg border text-sm">
            {SECCIONES.map(({ campo, titulo }) => {
              const texto =
                campo === 'alergias' && !anamnesis.alergias && anamnesis.sinAlergias
                  ? 'Sin alergias conocidas'
                  : anamnesis[campo]
              return (
                <div key={campo} className="flex flex-col gap-0.5 px-3 py-2.5">
                  <dt className="text-muted-foreground">{titulo}</dt>
                  <dd className="whitespace-pre-wrap">{texto ?? 'Sin dato'}</dd>
                </div>
              )
            })}
          </dl>
          <p className="text-muted-foreground text-sm tabular-nums">
            Actualizada el {formatearFechaNumerica(fechaEnZona(anamnesis.actualizada, ZONA))}
            {anamnesis.profesional && ` por ${anamnesis.profesional}`}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          Todavía no tiene anamnesis: antecedentes, alergias y medicamentos.
        </p>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>Anamnesis</SheetTitle>
                <SheetDescription>
                  Al guardar queda una versión nueva; la anterior no se borra.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                {SECCIONES.map(({ campo, titulo }) => (
                  <div key={campo} className="flex flex-col gap-1.5">
                    <label className="flex flex-col gap-1.5 text-sm font-medium">
                      {titulo}
                      <textarea
                        value={form[campo]}
                        onChange={(e) =>
                          cambiar(
                            campo === 'alergias' && e.target.value.trim()
                              ? { alergias: e.target.value, sinAlergias: false }
                              : { [campo]: e.target.value },
                          )
                        }
                        className={claseAreaTexto}
                      />
                    </label>
                    {campo === 'alergias' && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.sinAlergias}
                          onChange={(e) =>
                            cambiar({
                              sinAlergias: e.target.checked,
                              ...(e.target.checked && { alergias: '' }),
                            })
                          }
                          className="accent-primary size-5 shrink-0"
                        />
                        Sin alergias conocidas
                      </label>
                    )}
                  </div>
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
                <Button type="submit" size="lg" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar anamnesis'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

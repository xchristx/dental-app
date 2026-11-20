'use client'

import { useState, useTransition } from 'react'
import { PlusIcon, ProhibitIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { darDeBajaProfesional, guardarProfesional } from '@/lib/ajustes/acciones'
import type { ProfesionalAjustes } from '@/lib/ajustes/datos'
import { claseCampo } from './colores'

interface FormProfesional {
  id: string
  nombre: string
  especialidad: string
  tieneUsuario: boolean
  nuevo: boolean
}

/**
 * Profesionales que atienden en tus lugares (0002 y 0014). Las socias se
 * cargan aunque no usen la app, para que la agenda avise si ocupan tu sillón.
 * La admin agrega, edita y da de baja; una socia solo edita sus propios datos.
 */
export function Profesionales({
  profesionales,
  profesionalPropia,
  esAdmin,
}: {
  profesionales: ProfesionalAjustes[]
  profesionalPropia: string | null
  esAdmin: boolean
}) {
  const [form, setForm] = useState<FormProfesional | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmarBaja, setConfirmarBaja] = useState(false)
  const [guardando, iniciar] = useTransition()

  function abrir(p?: ProfesionalAjustes) {
    setError(null)
    setConfirmarBaja(false)
    setForm(
      p
        ? {
            id: p.id,
            nombre: p.nombre,
            especialidad: p.especialidad ?? '',
            tieneUsuario: p.tieneUsuario,
            nuevo: false,
          }
        : {
            id: crypto.randomUUID(),
            nombre: '',
            especialidad: '',
            tieneUsuario: false,
            nuevo: true,
          },
    )
  }

  const cambiar = (cambios: Partial<FormProfesional>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await guardarProfesional({
        id: form.id,
        nombre: form.nombre,
        especialidad: form.especialidad,
      })
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  function darDeBaja() {
    if (!form) return
    iniciar(async () => {
      const r = await darDeBajaProfesional(form.id)
      if (r.ok) setForm(null)
      else {
        setConfirmarBaja(false)
        setError(r.error)
      }
    })
  }

  return (
    <section aria-labelledby="titulo-profesionales" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-profesionales" className="text-lg font-medium">
          Profesionales
        </h2>
        <p className="text-muted-foreground text-sm">
          Quién atiende en tus lugares. Carga a tus socias aunque no usen la app: así la agenda
          avisa si ocupan tu sillón.
        </p>
      </div>

      <ul className="border-border bg-card divide-border divide-y rounded-lg border">
        {profesionales.map((p) => {
          const esPropia = p.id === profesionalPropia
          return (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {p.nombre}
                  {esPropia && ' '}
                  {esPropia && (
                    <span className="bg-muted text-muted-foreground ml-1 rounded-full px-1.5 py-0.5 text-xs font-medium">
                      Tú
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {p.especialidad ?? 'Sin especialidad'}
                </p>
              </div>
              {(esAdmin || esPropia) && (
                <Button variant="outline" onClick={() => abrir(p)}>
                  Editar
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {esAdmin && (
        <Button variant="outline" className="self-start" onClick={() => abrir()}>
          <PlusIcon weight="bold" />
          Agregar profesional
        </Button>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>{form.nuevo ? 'Nueva profesional' : 'Editar profesional'}</SheetTitle>
                <SheetDescription>
                  {form.nuevo
                    ? 'Por ejemplo, una socia que atiende en tu consultorio. No necesita usar la app.'
                    : 'El nombre se ve en la agenda y al agendar.'}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nombre
                  <input
                    value={form.nombre}
                    placeholder="Por ejemplo: Dra. Ana Rojas"
                    onChange={(e) => cambiar({ nombre: e.target.value })}
                    className={claseCampo}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Especialidad (opcional)
                  <input
                    value={form.especialidad}
                    placeholder="Por ejemplo: Ortodoncia"
                    onChange={(e) => cambiar({ especialidad: e.target.value })}
                    className={claseCampo}
                  />
                </label>

                {/* Dar de baja: solo la admin, y no a quien tiene usuario (0014). */}
                {esAdmin && !form.nuevo && (
                  <div className="flex flex-col gap-2">
                    {form.tieneUsuario ? (
                      <p className="text-muted-foreground text-sm">
                        Tiene un usuario para entrar a la app, así que no se puede dar de baja desde
                        aquí.
                      </p>
                    ) : confirmarBaja ? (
                      <div className="bg-destructive-bg flex flex-col gap-2 rounded-lg p-3">
                        <p className="text-destructive text-sm">
                          ¿Dar de baja a {form.nombre}? Deja de aparecer al agendar y en los
                          horarios. Sus citas pasadas quedan en el historial.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={guardando}
                            onClick={() => setConfirmarBaja(false)}
                          >
                            No
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={guardando}
                            onClick={darDeBaja}
                          >
                            Sí, dar de baja
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-destructive self-start"
                        onClick={() => setConfirmarBaja(true)}
                      >
                        <ProhibitIcon weight="bold" />
                        Dar de baja
                      </Button>
                    )}
                  </div>
                )}
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
                  {guardando ? 'Guardando…' : 'Guardar profesional'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

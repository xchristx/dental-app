'use client'

import { useState, useTransition } from 'react'
import { CheckIcon, PlusIcon } from '@phosphor-icons/react'
import { COLORES_LUGAR, type ColorLugar } from '@dental/core'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { guardarLugar } from '@/lib/ajustes/acciones'
import type { LugarAjustes } from '@/lib/ajustes/datos'
import { cn } from '@/lib/utils'
import { COLOR, claseCampo } from './colores'

interface FormLugar {
  id: string
  nombre: string
  color: ColorLugar
  controlaSillon: boolean
  direccion: string
  nuevo: boolean
}

/** Lugares de trabajo: nombre, color en la agenda y si tiene un solo sillón (0002). */
export function Lugares({ lugares }: { lugares: LugarAjustes[] }) {
  const [form, setForm] = useState<FormLugar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()

  function abrir(lugar?: LugarAjustes) {
    setError(null)
    // Para un lugar nuevo se propone un color que todavía no se use.
    const libre = COLORES_LUGAR.find((c) => !lugares.some((l) => l.color === c)) ?? 'gris'
    setForm(
      lugar
        ? { ...lugar, direccion: lugar.direccion ?? '', nuevo: false }
        : {
            id: crypto.randomUUID(),
            nombre: '',
            color: libre,
            controlaSillon: true,
            direccion: '',
            nuevo: true,
          },
    )
  }

  const cambiar = (cambios: Partial<FormLugar>) => {
    setError(null)
    setForm((f) => f && { ...f, ...cambios })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await guardarLugar({
        id: form.id,
        nombre: form.nombre,
        color: form.color,
        controlaSillon: form.controlaSillon,
        direccion: form.direccion,
      })
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  return (
    <section aria-labelledby="titulo-lugares" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-lugares" className="text-lg font-medium">
          Lugares de trabajo
        </h2>
        <p className="text-muted-foreground text-sm">
          Dónde atiendes. Cada lugar tiene un color en la agenda.
        </p>
      </div>

      {lugares.length > 0 ? (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {lugares.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2">
              <span className={cn('size-3 shrink-0 rounded-full', COLOR[l.color].punto)} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{l.nombre}</p>
                <p className="text-muted-foreground text-sm">
                  {l.controlaSillon
                    ? 'Un solo sillón: no admite dos citas a la vez'
                    : 'El lugar asigna el sillón: admite varias citas a la vez'}
                </p>
              </div>
              <Button variant="outline" onClick={() => abrir(l)}>
                Editar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Todavía no cargaste ningún lugar.</p>
      )}

      <Button variant="outline" className="self-start" onClick={() => abrir()}>
        <PlusIcon weight="bold" />
        Agregar lugar
      </Button>

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>{form.nuevo ? 'Nuevo lugar' : 'Editar lugar'}</SheetTitle>
                <SheetDescription>
                  Por ejemplo, tu consultorio, la clínica o el consultorio de una socia.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nombre
                  <input
                    value={form.nombre}
                    onChange={(e) => cambiar({ nombre: e.target.value })}
                    className={claseCampo}
                  />
                </label>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-sm font-medium">Color en la agenda</legend>
                  <div role="radiogroup" className="grid grid-cols-3 gap-2">
                    {COLORES_LUGAR.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={form.color === c}
                        onClick={() => cambiar({ color: c })}
                        className={cn(
                          'flex h-11 items-center gap-2 rounded-sm border px-3 text-sm',
                          COLOR[c].fondo,
                          form.color === c ? 'border-foreground' : 'border-transparent',
                        )}
                      >
                        <span className={cn('size-3 rounded-full', COLOR[c].punto)} />
                        {COLOR[c].nombre}
                        {form.color === c && <CheckIcon weight="bold" className="ml-auto size-4" />}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.controlaSillon}
                    onChange={(e) => cambiar({ controlaSillon: e.target.checked })}
                    className="accent-primary mt-0.5 size-5 shrink-0"
                  />
                  <span>
                    <span className="font-medium">Tiene un solo sillón</span>
                    <span className="text-muted-foreground block">
                      La app no deja agendar dos citas a la vez en este lugar, aunque sean de
                      profesionales distintas. Desmárcalo si el lugar asigna los sillones, como una
                      clínica.
                    </span>
                  </span>
                </label>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Dirección (opcional)
                  <input
                    value={form.direccion}
                    onChange={(e) => cambiar({ direccion: e.target.value })}
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
                  {guardando ? 'Guardando…' : 'Guardar lugar'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

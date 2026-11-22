import { useState, useTransition } from 'react'
import { NotePencilIcon } from '@phosphor-icons/react'
import {
  PREGUNTAS_EXAMEN,
  examenAlDia,
  fechaEnZona,
  formatearFechaNumerica,
  textoRespuesta,
  type PreguntaExamen,
} from '@dental/core'
import { claseAreaTexto, claseCampo } from '@/components/historia/campos'
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
import { guardarExamenBucal } from '@/lib/odontograma/acciones'
import type { ExamenBucal } from '@/lib/odontograma/datos'

type Form = Record<PreguntaExamen, boolean | null> & {
  id: string
  oclusion: string
  observaciones: string
}

const RESPUESTAS = [
  { valor: true, texto: 'Sí' },
  { valor: false, texto: 'No' },
  { valor: null, texto: 'Sin dato' },
] as const

/**
 * Datos generales de la hoja del odontograma (0024): higiene, oclusión y
 * observaciones. Cada vez que se guarda queda una versión nueva.
 */
export function SeccionExamenBucal({
  pacienteId,
  organizacionId,
  examenes,
  dia,
}: {
  pacienteId: string
  organizacionId: string
  /** De la versión más nueva a la más vieja. */
  examenes: ExamenBucal[]
  /** Un día anterior: la versión vigente entonces, solo para mirar. */
  dia: string | null
}) {
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()
  const examen = dia ? examenAlDia(examenes, dia) : (examenes[0] ?? null)

  function abrir() {
    setError(null)
    // Se parte de la versión vigente; al guardar queda una nueva, con su id.
    const ultimo = examenes[0]
    setForm({
      id: crypto.randomUUID(),
      usaMondadientes: ultimo?.usaMondadientes ?? null,
      cepillaLengua: ultimo?.cepillaLengua ?? null,
      tartaro: ultimo?.tartaro ?? null,
      halitosis: ultimo?.halitosis ?? null,
      placaBacteriana: ultimo?.placaBacteriana ?? null,
      materiaAlba: ultimo?.materiaAlba ?? null,
      oclusion: ultimo?.oclusion ?? '',
      observaciones: ultimo?.observaciones ?? '',
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
      const r = await guardarExamenBucal({ ...form, pacienteId }, organizacionId)
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  return (
    <section aria-labelledby="titulo-examen" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="titulo-examen" className="text-lg font-medium">
          Examen bucal
        </h2>
        {!dia && (
          <Button variant="outline" onClick={abrir}>
            <NotePencilIcon weight="bold" />
            {examen ? 'Actualizar' : 'Cargar examen'}
          </Button>
        )}
      </div>

      {examen ? (
        <>
          <dl className="border-border bg-card divide-border divide-y rounded-lg border text-sm">
            {PREGUNTAS_EXAMEN.map(({ campo, texto }) => (
              <div key={campo} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-muted-foreground">{texto}</dt>
                <dd className={examen[campo] === null ? 'text-muted-foreground' : 'font-medium'}>
                  {textoRespuesta(examen[campo])}
                </dd>
              </div>
            ))}
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <dt className="text-muted-foreground">Oclusión</dt>
              <dd>{examen.oclusion ?? 'Sin dato'}</dd>
            </div>
            <div className="flex flex-col gap-0.5 px-3 py-2">
              <dt className="text-muted-foreground">Observaciones</dt>
              <dd className="whitespace-pre-wrap">{examen.observaciones ?? 'Sin dato'}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-sm tabular-nums">
            Actualizado el {formatearFechaNumerica(fechaEnZona(examen.actualizado, ZONA))}
            {examen.profesional && ` por ${examen.profesional}`}
          </p>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {dia
            ? 'Todavía no tenía examen bucal.'
            : 'Todavía no tiene examen bucal: higiene, oclusión y observaciones.'}
        </p>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>Examen bucal</SheetTitle>
                <SheetDescription>
                  Al guardar queda una versión nueva; la anterior no se borra.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                {PREGUNTAS_EXAMEN.map(({ campo, texto }) => (
                  <fieldset key={campo} className="flex flex-col gap-2">
                    <legend className="mb-1.5 text-sm font-medium">{texto}</legend>
                    <div className="-my-2 flex flex-wrap gap-x-5">
                      {RESPUESTAS.map((r) => (
                        <label key={r.texto} className="flex min-h-11 items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={campo}
                            checked={form[campo] === r.valor}
                            onChange={() => cambiar({ [campo]: r.valor })}
                            className="accent-primary size-5 shrink-0"
                          />
                          {r.texto}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Oclusión
                  <input
                    name="oclusion"
                    value={form.oclusion}
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Por ejemplo: mordida abierta"
                    onChange={(e) => cambiar({ oclusion: e.target.value })}
                    className={claseCampo}
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Observaciones
                  <textarea
                    name="observaciones"
                    value={form.observaciones}
                    maxLength={2000}
                    aria-describedby="ayuda-observaciones"
                    onChange={(e) => cambiar({ observaciones: e.target.value })}
                    className={claseAreaTexto}
                  />
                  <span id="ayuda-observaciones" className="text-muted-foreground font-normal">
                    Lo que abarca varias piezas, como "cálculo abundante de 33 a 43".
                  </span>
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
                  {guardando ? 'Guardando…' : 'Guardar examen'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

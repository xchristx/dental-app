import { useId, useState, useTransition } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PlusIcon } from '@phosphor-icons/react'
import {
  INDICES_CODIGO,
  NOMBRE_INDICE,
  NOMBRE_SIMBOLO,
  SIMBOLOS_CODIGO,
  textoRegistro,
  type CodigoOdontograma,
  type IndiceCodigo,
  type SimboloCodigo,
  type TipoCodigo,
} from '@dental/core'
import { Diente } from '@/components/odontograma/diente'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cambiarBajaCodigo, guardarCodigo } from '@/lib/odontograma/acciones'
import { consultaCatalogo, type Codigo, type CodigoCatalogo } from '@/lib/odontograma/datos'
import { claseCampo } from './colores'

interface FormCodigo extends Omit<CodigoOdontograma, 'id'> {
  id: string
  nuevo: boolean
  usado: boolean
  activo: boolean
}

const GRUPOS: { tipo: TipoCodigo; titulo: string; color: string }[] = [
  { tipo: 'hallazgo', titulo: 'Hallazgos', color: 'rojo con rayas: lo que hay que tratar' },
  { tipo: 'realizado', titulo: 'Realizados', color: 'azul: lo hecho o en buen estado' },
]

/** "Pinta las caras · con grado · cuenta como cariada". */
function resumen(c: CodigoOdontograma) {
  return [
    NOMBRE_SIMBOLO[c.simbolo],
    c.porCaras && c.simbolo !== 'superficie' ? 'por caras' : null,
    c.usaGrado ? 'con grado' : null,
    c.indice ? `cuenta como ${NOMBRE_INDICE[c.indice].toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** El dibujo del código en una pieza de ejemplo, como en el gráfico. */
function Muestra({ codigo, className }: { codigo: Omit<Codigo, 'activo'>; className?: string }) {
  const registro = {
    id: 'muestra',
    pieza: 36,
    codigoId: codigo.id,
    resuelveId: null,
    caras: codigo.porCaras ? (['O', 'M'] as const).slice() : null,
    grado: codigo.usaGrado ? 2 : null,
    nota: null,
    fecha: '',
  }
  return (
    <Diente
      pieza={36}
      registros={[registro]}
      codigos={new Map([[codigo.id, { ...codigo, activo: true }]])}
      className={className}
    />
  )
}

/**
 * Los códigos del odontograma (0022): los ven todas y los cambia la
 * administradora. Un código ya usado no cambia de tipo, caras ni grado.
 */
export function CatalogoOdontograma({ esAdmin }: { esAdmin: boolean }) {
  const catalogo = useQuery(consultaCatalogo)
  const [form, setForm] = useState<FormCodigo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()
  const id = useId()

  const codigos = catalogo.data ?? []
  const dadosDeBaja = codigos.filter((c) => !c.activo)

  function abrir(codigo?: CodigoCatalogo) {
    setError(null)
    setForm(
      codigo
        ? { ...codigo, nuevo: false }
        : {
            id: crypto.randomUUID(),
            abreviatura: '',
            nombre: '',
            tipo: 'hallazgo',
            simbolo: 'texto',
            porCaras: false,
            usaGrado: false,
            indice: null,
            nuevo: true,
            usado: false,
            activo: true,
          },
    )
  }

  const cambiar = (cambios: Partial<FormCodigo>) => {
    setError(null)
    setForm((f) => {
      if (!f) return f
      const nuevo = { ...f, ...cambios }
      // Pintar las caras exige ir por caras; sin caras, no se pintan.
      if (cambios.simbolo === 'superficie') nuevo.porCaras = true
      if (cambios.porCaras === false && nuevo.simbolo === 'superficie') nuevo.simbolo = 'texto'
      return nuevo
    })
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!form) return
    iniciar(async () => {
      const r = await guardarCodigo(form)
      if (r.ok) setForm(null)
      else setError(r.error)
    })
  }

  function darDeBaja(baja: boolean, codigo: { id: string }) {
    iniciar(async () => {
      const r = await cambiarBajaCodigo(codigo.id, baja)
      if (!r.ok) {
        setError(r.error)
        return
      }
      setForm(null)
    })
  }

  return (
    <section aria-labelledby="titulo-catalogo" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-catalogo" className="text-lg font-medium">
          Códigos del odontograma
        </h2>
        <p className="text-muted-foreground text-sm">
          Las abreviaturas que se usan al cargar el odontograma, y cómo se dibuja cada una.
          {!esAdmin && ' Solo la administradora puede cambiarlos.'}
        </p>
      </div>

      {catalogo.isPending ? (
        <div
          aria-busy="true"
          aria-label="Cargando los códigos"
          className="bg-muted h-72 rounded-lg"
        />
      ) : (
        GRUPOS.map((g) => {
          const delGrupo = codigos.filter((c) => c.activo && c.tipo === g.tipo)
          return (
            <div key={g.tipo} className="flex flex-col gap-1.5">
              <h3 className="text-sm font-medium">
                {g.titulo} <span className="text-muted-foreground font-normal">· {g.color}</span>
              </h3>
              <ul className="border-border bg-card divide-border divide-y rounded-lg border">
                {delGrupo.map((c) => (
                  <FilaCodigo key={c.id} codigo={c}>
                    {esAdmin && (
                      <Button
                        variant="outline"
                        onClick={() => abrir(c)}
                        aria-label={`Editar ${c.abreviatura} (${c.nombre})`}
                      >
                        Editar
                      </Button>
                    )}
                  </FilaCodigo>
                ))}
              </ul>
            </div>
          )
        })
      )}

      {dadosDeBaja.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-sm font-medium">
            Dados de baja{' '}
            <span className="text-muted-foreground font-normal">
              · no se usan para cargar, pero lo ya cargado se sigue viendo
            </span>
          </h3>
          <ul className="border-border bg-card divide-border divide-y rounded-lg border">
            {dadosDeBaja.map((c) => (
              <FilaCodigo key={c.id} codigo={c}>
                {esAdmin && (
                  <Button
                    variant="outline"
                    disabled={guardando}
                    onClick={() => darDeBaja(false, c)}
                    aria-label={`Volver a usar ${c.abreviatura} (${c.nombre})`}
                  >
                    Volver a usar
                  </Button>
                )}
              </FilaCodigo>
            ))}
          </ul>
        </div>
      )}

      {error && !form && (
        <p role="alert" className="bg-destructive-bg text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {esAdmin && (
        <Button variant="outline" className="self-start" onClick={() => abrir()}>
          <PlusIcon weight="bold" />
          Agregar código
        </Button>
      )}

      <Sheet open={form !== null} onOpenChange={(abierto) => !abierto && setForm(null)}>
        <SheetContent>
          {form && (
            <form onSubmit={guardar} className="flex min-h-full flex-col" noValidate>
              <SheetHeader>
                <SheetTitle>
                  {form.nuevo ? 'Nuevo código' : `Editar ${form.abreviatura}`}
                </SheetTitle>
                <SheetDescription>
                  Los cambios se ven en todo el odontograma, también en lo ya cargado.
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-4 py-3 md:px-6">
                <div className="bg-muted flex items-center gap-4 rounded-lg p-3">
                  <Muestra codigo={form} className="size-14 shrink-0" />
                  <p className="text-sm">
                    <span className="text-muted-foreground block">Así se ve en la pieza 36</span>
                    <span className="font-medium tabular-nums">
                      {textoRegistro(
                        {
                          pieza: 36,
                          caras: form.porCaras ? ['O', 'M'] : null,
                          grado: form.usaGrado ? 2 : null,
                        },
                        { abreviatura: form.abreviatura.trim() || '…' },
                      )}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-[8rem_1fr] gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Abreviatura
                    <input
                      name="abreviatura"
                      value={form.abreviatura}
                      onChange={(e) => cambiar({ abreviatura: e.target.value })}
                      maxLength={8}
                      required
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className={claseCampo}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Nombre
                    <input
                      name="nombre"
                      value={form.nombre}
                      onChange={(e) => cambiar({ nombre: e.target.value })}
                      maxLength={80}
                      required
                      autoComplete="off"
                      className={claseCampo}
                    />
                  </label>
                </div>

                {form.usado && (
                  <p id={`${id}-usado`} className="text-muted-foreground text-sm">
                    Este código ya se usó, así que no cambia si es hallazgo o realizado, si va por
                    caras ni si lleva grado. Para eso, dalo de baja y crea otro.
                  </p>
                )}

                <fieldset
                  disabled={form.usado}
                  aria-describedby={form.usado ? `${id}-usado` : undefined}
                  className="flex flex-col gap-2"
                >
                  <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
                  {GRUPOS.map((g) => (
                    <label key={g.tipo} className="flex items-start gap-3 text-sm">
                      <input
                        type="radio"
                        name="tipo"
                        value={g.tipo}
                        checked={form.tipo === g.tipo}
                        onChange={() => cambiar({ tipo: g.tipo })}
                        className="accent-primary mt-0.5 size-5 shrink-0"
                      />
                      <span>
                        <span className="font-medium">
                          {g.tipo === 'hallazgo' ? 'Hallazgo' : 'Realizado'}
                        </span>
                        <span className="text-muted-foreground block">En {g.color}.</span>
                      </span>
                    </label>
                  ))}
                </fieldset>

                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Dibujo
                  <select
                    name="simbolo"
                    value={form.simbolo}
                    onChange={(e) => {
                      const simbolo = SIMBOLOS_CODIGO.find((s) => s === e.target.value)
                      if (simbolo) cambiar({ simbolo })
                    }}
                    className={claseCampo}
                  >
                    {SIMBOLOS_CODIGO.map((s: SimboloCodigo) => (
                      <option
                        key={s}
                        value={s}
                        disabled={s === 'superficie' && form.usado && !form.porCaras}
                      >
                        {NOMBRE_SIMBOLO[s]}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset
                  disabled={form.usado}
                  aria-describedby={form.usado ? `${id}-usado` : undefined}
                  className="flex flex-col gap-3"
                >
                  <legend className="mb-1.5 text-sm font-medium">Al cargarlo</legend>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="porCaras"
                      checked={form.porCaras}
                      onChange={(e) => cambiar({ porCaras: e.target.checked })}
                      className="accent-primary mt-0.5 size-5 shrink-0"
                    />
                    <span>
                      <span className="font-medium">Se eligen las caras</span>
                      <span className="text-muted-foreground block">Como "Obt-OM".</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      name="usaGrado"
                      checked={form.usaGrado}
                      onChange={(e) => cambiar({ usaGrado: e.target.checked })}
                      className="accent-primary mt-0.5 size-5 shrink-0"
                    />
                    <span>
                      <span className="font-medium">Lleva grado (I a IV)</span>
                      <span className="text-muted-foreground block">Como "C II-O".</span>
                    </span>
                  </label>
                </fieldset>

                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-sm font-medium">En el CPO-D y el ceo-d</legend>
                  {[null, ...INDICES_CODIGO].map((i: IndiceCodigo | null) => (
                    <label key={i ?? 'ninguno'} className="flex items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name="indice"
                        value={i ?? ''}
                        checked={form.indice === i}
                        onChange={() => cambiar({ indice: i })}
                        className="accent-primary size-5 shrink-0"
                      />
                      {i ? `Cuenta como ${NOMBRE_INDICE[i].toLowerCase()}` : 'No cuenta'}
                    </label>
                  ))}
                </fieldset>

                {!form.nuevo && form.activo && (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-sm">
                      Dado de baja, no aparece para cargar, pero lo ya cargado con este código se
                      sigue viendo.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="self-start"
                      disabled={guardando}
                      onClick={() => darDeBaja(true, form)}
                    >
                      Dar de baja
                    </Button>
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
                  {guardando ? 'Guardando…' : 'Guardar código'}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </section>
  )
}

function FilaCodigo({ codigo, children }: { codigo: CodigoCatalogo; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Muestra codigo={codigo} className="size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate">
          <span className="font-medium">{codigo.abreviatura}</span> {codigo.nombre}
        </p>
        <p className="text-muted-foreground text-sm">{resumen(codigo)}</p>
      </div>
      {children}
    </li>
  )
}

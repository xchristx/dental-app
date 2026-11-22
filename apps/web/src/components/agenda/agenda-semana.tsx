'use client'

import { createContext, use, useId, useMemo, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import {
  diaCorto,
  diasDeLaSemana,
  esFechaValida,
  fechaEnZona,
  formatearDiaLargo,
  formatearRangoSemana,
  sumarDias,
  type Fecha,
} from '@dental/core'
import { AgendarCita } from '@/components/agenda/agendar-cita'
import { BloqueCita } from '@/components/agenda/bloque-cita'
import { DetalleSeleccionado } from '@/components/agenda/detalle-cita'
import { EnlaceDetalle } from '@/components/agenda/enlace-detalle'
import { Button } from '@/components/ui/button'
import { Cargando } from '@/components/ui/cargando'
import type { CitaAgenda, EnlacesReagenda } from '@/lib/agenda/datos'
import type { OpcionesAgendar } from '@/lib/agenda/opciones'
import { ZONA } from '@/lib/agenda/zona'
import { cn } from '@/lib/utils'

/** URL de la agenda: `/?fecha=…&cita=…`. Sin fecha, es hoy. */
export function urlAgenda({ fecha, cita }: { fecha?: Fecha; cita?: string }): string {
  const parametros = new URLSearchParams()
  if (fecha) parametros.set('fecha', fecha)
  if (cita) parametros.set('cita', cita)
  const consulta = parametros.toString()
  return consulta ? `/?${consulta}` : '/'
}

/**
 * La semana que mandó el servidor. El día que se ve sale de la URL y se lee
 * en el navegador: pasar a otro día de la misma semana no va al servidor.
 * Pasar a otra semana sí, porque hacen falta sus citas.
 */
export function AgendaSemana({
  citas,
  enlaces,
  opciones,
  lunes,
  hoy,
  fechaInicial,
}: {
  citas: CitaAgenda[]
  enlaces: Record<string, EnlacesReagenda>
  opciones: OpcionesAgendar
  /** Lunes de la semana que se cargó. */
  lunes: Fecha
  hoy: Fecha
  /** El día que pidió la URL al cargar la página. */
  fechaInicial: Fecha
}) {
  const valor = useSearchParams().get('fecha')
  const pedida = esFechaValida(valor) ? valor : hoy
  // Si la URL pide un día de otra semana (no debería pasar), se queda en el inicial.
  const fecha = esDeLaSemana(pedida, lunes) ? pedida : fechaInicial
  const hrefCita = (id: string) => urlAgenda({ fecha, cita: id })

  // Otra semana va al servidor y puede tardar: mientras tanto, la semana que
  // se ve queda atenuada y junto a la fecha aparece un indicador de carga.
  const router = useRouter()
  const [cargando, iniciar] = useTransition()
  const cambio = useMemo(
    () => ({ cargando, ir: (href: string) => iniciar(() => router.push(href)) }),
    [cargando, router],
  )
  const atenuar = cn(cargando && 'opacity-50 transition-opacity delay-150 duration-200')

  return (
    <CambioDeSemana value={cambio}>
      <Encabezado fecha={fecha} lunes={lunes} hoy={hoy}>
        <AgendarCita opciones={opciones} fecha={fecha} />
      </Encabezado>
      <p role="status" className="sr-only">
        {cargando ? 'Cargando la semana…' : ''}
      </p>
      <VistaDia citas={delDia(citas, fecha)} hrefCita={hrefCita} className={atenuar} />
      <VistaSemana citas={citas} lunes={lunes} hoy={hoy} hrefCita={hrefCita} className={atenuar} />
      <DetalleSeleccionado citas={citas} enlaces={enlaces} opciones={opciones} fecha={fecha} />
    </CambioDeSemana>
  )
}

/** Ir a otra semana (con el servidor) y saber si todavía está cargando. */
const CambioDeSemana = createContext<{ cargando: boolean; ir: (href: string) => void }>({
  cargando: false,
  ir: () => {},
})

function esDeLaSemana(fecha: Fecha, lunes: Fecha) {
  return fecha >= lunes && fecha <= sumarDias(lunes, 6)
}

function delDia(citas: CitaAgenda[], fecha: Fecha) {
  return citas.filter((c) => fechaEnZona(c.inicio, ZONA) === fecha)
}

/**
 * Enlace a un día. Dentro de la semana cargada cambia solo la URL; fuera de
 * ella navega con Next y el servidor trae la otra semana.
 */
function EnlaceFecha({
  fecha,
  hoy,
  lunes,
  className,
  children,
  ...props
}: {
  fecha: Fecha
  hoy: Fecha
  lunes: Fecha
  className?: string
  children: React.ReactNode
  'aria-label'?: string
}) {
  const { ir } = use(CambioDeSemana)
  // "Hoy" va sin fecha en la URL, como al entrar.
  const href = urlAgenda({ fecha: fecha === hoy ? undefined : fecha })
  if (esDeLaSemana(fecha, lunes)) {
    return (
      <EnlaceDetalle href={href} className={className} {...props}>
        {children}
      </EnlaceDetalle>
    )
  }
  // Sigue siendo un Link (precarga, abrir en otra pestaña), pero el clic
  // normal navega dentro de la transición que muestra la carga.
  return (
    <Link
      href={href}
      className={className}
      {...props}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        ir(href)
      }}
    >
      {children}
    </Link>
  )
}

function Encabezado({
  fecha,
  lunes,
  hoy,
  children,
}: {
  fecha: Fecha
  lunes: Fecha
  hoy: Fecha
  children: React.ReactNode
}) {
  // En el celular las flechas mueven un día; desde tablet, una semana.
  const flechas = [
    {
      clase: 'md:hidden',
      antes: sumarDias(fecha, -1),
      despues: sumarDias(fecha, 1),
      unidad: 'Día',
    },
    {
      clase: 'hidden md:inline-flex',
      antes: sumarDias(fecha, -7),
      despues: sumarDias(fecha, 7),
      unidad: 'Semana',
    },
  ]

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-3xl leading-[1.1] tracking-[-0.02em]">
        <ElegirFecha fecha={fecha} lunes={lunes} hoy={hoy} />
      </h1>

      <nav aria-label="Cambiar de fecha" className="flex items-center gap-2">
        {flechas.map((f) => (
          <Button
            key={`antes-${f.unidad}`}
            asChild
            variant="outline"
            size="icon"
            className={f.clase}
          >
            <EnlaceFecha
              fecha={f.antes}
              hoy={hoy}
              lunes={lunes}
              aria-label={`${f.unidad} anterior`}
            >
              <CaretLeftIcon weight="bold" />
            </EnlaceFecha>
          </Button>
        ))}
        <Button asChild variant="outline">
          <EnlaceFecha fecha={hoy} hoy={hoy} lunes={lunes}>
            Hoy
          </EnlaceFecha>
        </Button>
        {flechas.map((f) => (
          <Button
            key={`despues-${f.unidad}`}
            asChild
            variant="outline"
            size="icon"
            className={f.clase}
          >
            <EnlaceFecha
              fecha={f.despues}
              hoy={hoy}
              lunes={lunes}
              aria-label={`${f.unidad} siguiente`}
            >
              <CaretRightIcon weight="bold" />
            </EnlaceFecha>
          </Button>
        ))}
        {/* AgendarCita dibuja su botón aquí desde tablet y uno fijo abajo en el celular. */}
        <div className="md:ml-2">{children}</div>
      </nav>
    </header>
  )
}

/**
 * El título de la agenda abre el calendario del sistema para ir a cualquier
 * día sin tocar las flechas una y otra vez. En Android es el selector de fecha
 * que ella ya conoce, con meses y años. Desde tablet, el día elegido lleva a
 * su semana.
 */
function ElegirFecha({ fecha, lunes, hoy }: { fecha: Fecha; lunes: Fecha; hoy: Fecha }) {
  const { ir: irASemana, cargando } = use(CambioDeSemana)
  const entrada = useRef<HTMLInputElement>(null)
  const idAyuda = useId()

  function abrir() {
    const el = entrada.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      // Sin showPicker, o si el navegador lo rechaza: el clic también lo abre en el celular.
      el.click()
    }
  }

  function ir(destino: string) {
    if (!esFechaValida(destino) || destino === fecha) return
    // "Hoy" va sin fecha en la URL, como al entrar.
    const href = urlAgenda({ fecha: destino === hoy ? undefined : destino })
    if (esDeLaSemana(destino, lunes)) window.history.pushState(null, '', href)
    else irASemana(href)
  }

  return (
    <span className="relative inline-block">
      {/* py-1.5 lleva el área de toque a 44px. */}
      <button
        type="button"
        onClick={abrir}
        aria-describedby={idAyuda}
        className="hover:bg-muted focus-visible:ring-ring/40 -mx-1.5 inline-block rounded-sm px-1.5 py-1.5 text-left transition-colors duration-150 outline-none focus-visible:ring-3"
      >
        <span className="md:hidden">
          <ConFlecha texto={formatearDiaLargo(fecha)} cargando={cargando} />
        </span>
        <span className="hidden md:inline">
          <ConFlecha texto={formatearRangoSemana(lunes)} cargando={cargando} />
        </span>
      </button>
      <span id={idAyuda} className="sr-only">
        Abre el calendario para ir a otra fecha.
      </span>
      {/* El calendario nativo sale de aquí. El botón es el único control: este
          campo no recibe foco ni lo anuncian los lectores de pantalla. */}
      <input
        ref={entrada}
        type="date"
        value={fecha}
        onChange={(e) => ir(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 size-px opacity-0"
      />
    </span>
  )
}

/**
 * La flecha va pegada a la última palabra: si el título corta, bajan juntas.
 * Mientras carga otra semana, en su lugar aparece el indicador de carga (sin
 * mover nada: ocupan el mismo espacio). El aviso para lectores de pantalla lo
 * da el role="status" de AgendaSemana.
 */
function ConFlecha({ texto, cargando }: { texto: string; cargando: boolean }) {
  const corte = texto.lastIndexOf(' ') + 1
  return (
    <>
      {texto.slice(0, corte)}
      <span className="whitespace-nowrap">
        {texto.slice(corte)}
        <span className="ml-2 inline-grid size-5 place-items-center align-middle *:col-start-1 *:row-start-1">
          <CaretDownIcon
            weight="bold"
            className={cn('text-muted-foreground size-5', cargando && 'cargando-reemplaza')}
          />
          {cargando && <Cargando decorativo className="size-5" />}
        </span>
      </span>
    </>
  )
}

function VistaDia({
  citas,
  hrefCita,
  className,
}: {
  citas: CitaAgenda[]
  hrefCita: (id: string) => string
  className?: string
}) {
  if (citas.length === 0) {
    return (
      <p className={cn('text-muted-foreground md:hidden', className)}>No tienes citas este día.</p>
    )
  }
  return (
    <ol className={cn('flex flex-col gap-3 md:hidden', className)}>
      {citas.map((cita) => (
        <li key={cita.id}>
          <BloqueCita cita={cita} href={hrefCita(cita.id)} />
        </li>
      ))}
    </ol>
  )
}

function VistaSemana({
  citas,
  lunes,
  hoy,
  hrefCita,
  className,
}: {
  citas: CitaAgenda[]
  lunes: Fecha
  hoy: Fecha
  hrefCita: (id: string) => string
  className?: string
}) {
  return (
    <div className={cn('hidden flex-1 grid-cols-7 gap-2 md:grid xl:gap-3', className)}>
      {diasDeLaSemana(lunes).map((dia) => {
        const { nombre, numero } = diaCorto(dia)
        const esHoy = dia === hoy
        const citasDelDia = delDia(citas, dia)
        return (
          <section key={dia} aria-label={formatearDiaLargo(dia)} className="min-w-0">
            <h2
              className={cn(
                'border-border mb-3 flex items-baseline gap-1.5 border-b pb-2 text-sm',
                esHoy ? 'text-foreground font-medium' : 'text-muted-foreground',
              )}
            >
              {nombre}
              <span
                className={cn(
                  'tabular-nums',
                  esHoy && 'bg-primary text-primary-foreground rounded-full px-1.5',
                )}
              >
                {numero}
              </span>
            </h2>
            {citasDelDia.length > 0 ? (
              <ol className="flex flex-col gap-2">
                {citasDelDia.map((cita) => (
                  <li key={cita.id}>
                    <BloqueCita cita={cita} href={hrefCita(cita.id)} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm">Sin citas</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
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

  return (
    <>
      <Encabezado fecha={fecha} lunes={lunes} hoy={hoy}>
        <AgendarCita opciones={opciones} fecha={fecha} />
      </Encabezado>
      <VistaDia citas={delDia(citas, fecha)} hrefCita={hrefCita} />
      <VistaSemana citas={citas} lunes={lunes} hoy={hoy} hrefCita={hrefCita} />
      <DetalleSeleccionado citas={citas} enlaces={enlaces} opciones={opciones} fecha={fecha} />
    </>
  )
}

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
  // "Hoy" va sin fecha en la URL, como al entrar.
  const href = urlAgenda({ fecha: fecha === hoy ? undefined : fecha })
  if (esDeLaSemana(fecha, lunes)) {
    return (
      <EnlaceDetalle href={href} className={className} {...props}>
        {children}
      </EnlaceDetalle>
    )
  }
  return (
    <Link href={href} className={className} {...props}>
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
        <span className="md:hidden">{formatearDiaLargo(fecha)}</span>
        <span className="hidden md:inline">{formatearRangoSemana(lunes)}</span>
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

function VistaDia({ citas, hrefCita }: { citas: CitaAgenda[]; hrefCita: (id: string) => string }) {
  if (citas.length === 0) {
    return <p className="text-muted-foreground md:hidden">No tienes citas este día.</p>
  }
  return (
    <ol className="flex flex-col gap-3 md:hidden">
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
}: {
  citas: CitaAgenda[]
  lunes: Fecha
  hoy: Fecha
  hrefCita: (id: string) => string
}) {
  return (
    <div className="hidden flex-1 grid-cols-7 gap-2 md:grid xl:gap-3">
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

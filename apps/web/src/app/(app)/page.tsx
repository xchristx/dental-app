import { Suspense } from 'react'
import Link from 'next/link'
import { connection } from 'next/server'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react/ssr'
import {
  diaCorto,
  diasDeLaSemana,
  esFechaValida,
  fechaEnZona,
  formatearDiaLargo,
  formatearRangoSemana,
  lunesDeLaSemana,
  sumarDias,
  type Fecha,
} from '@dental/core'
import { AgendarCita } from '@/components/agenda/agendar-cita'
import { BloqueCita } from '@/components/agenda/bloque-cita'
import { Button } from '@/components/ui/button'
import { ZONA, citasDeLaSemana, type CitaAgenda } from '@/lib/agenda/datos'
import { opcionesParaAgendar } from '@/lib/agenda/opciones'
import { cn } from '@/lib/utils'

// Agenda: día en el celular, semana desde tablet (decisión 0009).
// La fecha va en la URL (?fecha=2026-11-19) para que se pueda compartir y
// para que "atrás" del navegador funcione.
export default function AgendaPage({ searchParams }: PageProps<'/'>) {
  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8 lg:py-8">
      <Suspense fallback={<EsqueletoAgenda />}>
        <Agenda parametros={searchParams} />
      </Suspense>
    </main>
  )
}

async function Agenda({ parametros }: { parametros: PageProps<'/'>['searchParams'] }) {
  const { fecha: valor } = await parametros
  // "Hoy" depende del momento del request, no del prerender.
  await connection()
  const hoy = fechaEnZona(new Date(), ZONA)
  const fecha = esFechaValida(valor) ? valor : hoy
  const lunes = lunesDeLaSemana(fecha)
  const [citas, opciones] = await Promise.all([citasDeLaSemana(lunes), opcionesParaAgendar()])

  return (
    <>
      <Encabezado fecha={fecha} lunes={lunes}>
        <AgendarCita opciones={opciones} fecha={fecha} />
      </Encabezado>
      <VistaDia citas={delDia(citas, fecha)} />
      <VistaSemana citas={citas} lunes={lunes} hoy={hoy} />
    </>
  )
}

function delDia(citas: CitaAgenda[], fecha: Fecha) {
  return citas.filter((c) => fechaEnZona(c.inicio, ZONA) === fecha)
}

function Encabezado({
  fecha,
  lunes,
  children,
}: {
  fecha: Fecha
  lunes: Fecha
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
            <Link href={`/?fecha=${f.antes}`} aria-label={`${f.unidad} anterior`}>
              <CaretLeftIcon weight="bold" />
            </Link>
          </Button>
        ))}
        <Button asChild variant="outline">
          <Link href="/">Hoy</Link>
        </Button>
        {flechas.map((f) => (
          <Button
            key={`despues-${f.unidad}`}
            asChild
            variant="outline"
            size="icon"
            className={f.clase}
          >
            <Link href={`/?fecha=${f.despues}`} aria-label={`${f.unidad} siguiente`}>
              <CaretRightIcon weight="bold" />
            </Link>
          </Button>
        ))}
        {/* AgendarCita dibuja su botón aquí desde tablet y uno fijo abajo en el celular. */}
        <div className="md:ml-2">{children}</div>
      </nav>
    </header>
  )
}

function VistaDia({ citas }: { citas: CitaAgenda[] }) {
  if (citas.length === 0) {
    return <p className="text-muted-foreground md:hidden">No tienes citas este día.</p>
  }
  return (
    <ol className="flex flex-col gap-3 md:hidden">
      {citas.map((cita) => (
        <li key={cita.id}>
          <BloqueCita cita={cita} />
        </li>
      ))}
    </ol>
  )
}

function VistaSemana({ citas, lunes, hoy }: { citas: CitaAgenda[]; lunes: Fecha; hoy: Fecha }) {
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
                    <BloqueCita cita={cita} />
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

// Mientras cargan las citas: formas grises fijas, sin animación (docs/diseno.md).
function EsqueletoAgenda() {
  return (
    <div aria-busy="true" aria-label="Cargando la agenda" className="flex flex-col gap-6">
      <div className="bg-muted h-9 w-64 rounded-sm" />
      <div className="flex flex-col gap-3 md:hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-24 rounded-lg" />
        ))}
      </div>
      <div className="hidden grid-cols-7 gap-2 md:grid xl:gap-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="bg-muted h-40 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

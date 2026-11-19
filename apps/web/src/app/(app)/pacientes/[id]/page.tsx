import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { CaretLeftIcon, WhatsappLogoIcon } from '@phosphor-icons/react/ssr'
import {
  ESTADOS_QUE_OCUPAN,
  edad,
  fechaEnZona,
  formatearDiaLargo,
  formatearHora,
  puntualidad,
  telefonoParaWhatsApp,
  textoPuntualidad,
  type EstadoCita,
} from '@dental/core'
import { badges } from '@/components/agenda/bloque-cita'
import { FormularioPaciente } from '@/components/pacientes/formulario-paciente'
import { ZONA } from '@/lib/agenda/zona'
import { fichaDePaciente, type CitaDelPaciente } from '@/lib/pacientes/datos'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Paciente' }

export default function FichaPage({ params }: PageProps<'/pacientes/[id]'>) {
  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <Link
        href="/pacientes"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 items-center gap-1 self-start text-sm"
      >
        <CaretLeftIcon weight="bold" className="size-4" />
        Pacientes
      </Link>
      <Suspense fallback={<div aria-busy="true" className="bg-muted h-96 rounded-lg" />}>
        <Ficha params={params} />
      </Suspense>
    </main>
  )
}

async function Ficha({ params }: { params: PageProps<'/pacientes/[id]'>['params'] }) {
  const { id } = await params
  const paciente = await fichaDePaciente(id)
  if (!paciente) notFound()

  // "Próximas" y la edad dependen del momento del request.
  await connection()
  const ahora = new Date()
  const hoy = fechaEnZona(ahora, ZONA)
  const ocupa = (e: EstadoCita) => (ESTADOS_QUE_OCUPAN as readonly EstadoCita[]).includes(e)
  const proximas = paciente.citas
    .filter((c) => c.fin > ahora && ocupa(c.estado))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
  const anteriores = paciente.citas.filter((c) => !proximas.includes(c))
  const anios = edad(paciente.fechaNacimiento, hoy)
  const habito = puntualidad(paciente.citas.filter((c) => c.estado === 'atendida'))
  const whatsapp = telefonoParaWhatsApp(paciente.telefono)

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium">{paciente.nombre}</h1>
          {habito && (
            <p className="text-muted-foreground">
              {textoPuntualidad(habito.llegada)} (según {habito.citas} citas)
            </p>
          )}
        </div>
        <FormularioPaciente paciente={paciente} />
      </header>

      <dl className="border-border bg-card divide-border divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Celular</dt>
          <dd className="flex items-center gap-2 tabular-nums">
            {paciente.telefono ?? 'Sin celular'}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Escribirle por WhatsApp"
                className="hover:bg-muted flex size-11 items-center justify-center rounded-sm"
              >
                <WhatsappLogoIcon weight="bold" className="size-5" />
              </a>
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4 px-3 py-2.5">
          <dt className="text-muted-foreground">Fecha de nacimiento</dt>
          <dd className="tabular-nums">
            {paciente.fechaNacimiento
              ? `${paciente.fechaNacimiento.split('-').reverse().join('/')}${anios !== null ? ` · ${anios} años` : ''}`
              : 'Sin dato'}
          </dd>
        </div>
      </dl>

      <ListaCitas
        titulo="Próximas citas"
        citas={proximas}
        vacia="No tiene citas agendadas. Se agendan desde la agenda."
      />
      <ListaCitas titulo="Historial" citas={anteriores} vacia="Todavía no tuvo citas." />
    </>
  )
}

function ListaCitas({
  titulo,
  citas,
  vacia,
}: {
  titulo: string
  citas: CitaDelPaciente[]
  vacia: string
}) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">{titulo}</h2>
      {citas.length === 0 ? (
        <p className="text-muted-foreground text-sm">{vacia}</p>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {citas.map((c) => {
            const fecha = fechaEnZona(c.inicio, ZONA)
            const badge = badges[c.estado]
            return (
              <li key={c.id}>
                {/* Abre el detalle de la cita en la agenda. */}
                <Link
                  href={`/?fecha=${fecha}&cita=${c.id}`}
                  className="hover:bg-muted flex items-center gap-3 px-3 py-2.5 transition-colors duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'font-medium tabular-nums',
                        c.estado === 'cancelada' && 'line-through opacity-50',
                      )}
                    >
                      {formatearDiaLargo(fecha)} · {formatearHora(c.inicio, ZONA)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {c.tipo ?? 'Cita'} · {c.lugar} · {c.profesional}
                    </p>
                  </div>
                  {c.estado === 'atendida' ? (
                    <span className="text-muted-foreground text-sm">Atendida</span>
                  ) : (
                    badge && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-xs font-medium',
                          badge.clase,
                          c.estado === 'agendada' && 'border-border border',
                        )}
                      >
                        {badge.texto}
                      </span>
                    )
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

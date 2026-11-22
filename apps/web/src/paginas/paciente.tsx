import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { CaretLeftIcon, WhatsappLogoIcon } from '@phosphor-icons/react'
import {
  ESTADOS_QUE_OCUPAN,
  edad,
  fechaEnZona,
  formatearDiaLargo,
  formatearFechaNumerica,
  formatearHora,
  puntualidad,
  telefonoParaWhatsApp,
  textoPuntualidad,
  type EstadoCita,
} from '@dental/core'
import { badges } from '@/components/agenda/bloque-cita'
import { Enlace } from '@/components/enlace'
import { AvisoAlergias } from '@/components/historia/aviso-alergias'
import { SeccionAnamnesis } from '@/components/historia/anamnesis'
import { SeccionDerivaciones } from '@/components/historia/derivaciones'
import { SeccionEvolucion, type OpcionCita } from '@/components/historia/evolucion'
import { ResumenOdontograma } from '@/components/odontograma/resumen'
import { FormularioPaciente } from '@/components/pacientes/formulario-paciente'
import { ZONA } from '@/lib/agenda/zona'
import { consultaHistoria } from '@/lib/historia/datos'
import { tituloDePagina } from '@/lib/navegacion'
import { fichaDePaciente, type CitaDelPaciente, type FichaPaciente } from '@/lib/pacientes/datos'
import { cn } from '@/lib/utils'
import { PaginaNoEncontrada } from './no-encontrada'

export function PaginaPaciente() {
  const { id = '' } = useParams({ strict: false })
  const ficha = useQuery({ queryKey: ['paciente', id], queryFn: () => fichaDePaciente(id) })
  useEffect(() => tituloDePagina(ficha.data?.nombre ?? 'Paciente'), [ficha.data?.nombre])

  if (ficha.data === null) return <PaginaNoEncontrada />

  return (
    <main className="flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <Enlace
        href="/pacientes"
        className="text-muted-foreground hover:text-foreground -ml-1 flex min-h-11 items-center gap-1 self-start text-sm"
      >
        <CaretLeftIcon weight="bold" className="size-4" />
        Pacientes
      </Enlace>
      {ficha.data ? (
        <Ficha paciente={ficha.data} />
      ) : (
        <div aria-busy="true" aria-label="Cargando la ficha" className="bg-muted h-96 rounded-lg" />
      )}
    </main>
  )
}

function Ficha({ paciente }: { paciente: FichaPaciente }) {
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
  const historia = useQuery(consultaHistoria(paciente.id))
  // Las citas atendidas, para ligarles una evolución.
  const citasAtendidas: OpcionCita[] = paciente.citas
    .filter((c) => c.estado === 'atendida')
    .map((c) => {
      const fecha = fechaEnZona(c.inicio, ZONA)
      return {
        id: c.id,
        fecha,
        etiqueta: `${formatearFechaNumerica(fecha)} · ${c.tipo ?? 'Cita'} · ${c.lugar}`,
      }
    })

  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-medium">{paciente.nombre}</h1>
            {habito && (
              <p className="text-muted-foreground">
                {textoPuntualidad(habito.llegada)} (según {habito.citas} citas)
              </p>
            )}
          </div>
          <FormularioPaciente paciente={paciente} />
        </div>
        {historia.data && <AvisoAlergias anamnesis={historia.data.anamnesis} />}
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

      {historia.data ? (
        <>
          <SeccionAnamnesis
            pacienteId={paciente.id}
            organizacionId={historia.data.organizacionId}
            anamnesis={historia.data.anamnesis}
          />
          <ResumenOdontograma pacienteId={paciente.id} />
          <SeccionEvolucion
            pacienteId={paciente.id}
            organizacionId={historia.data.organizacionId}
            evoluciones={historia.data.evoluciones}
            citas={citasAtendidas}
          />
          <SeccionDerivaciones
            pacienteId={paciente.id}
            organizacionId={historia.data.organizacionId}
            derivaciones={historia.data.derivaciones}
          />
        </>
      ) : (
        <div
          aria-busy="true"
          aria-label="Cargando la historia clínica"
          className="bg-muted h-64 rounded-lg"
        />
      )}

      <ListaCitas titulo="Historial de citas" citas={anteriores} vacia="Todavía no tuvo citas." />
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
                <Enlace
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
                  {c.reagendada && (
                    <span className="text-muted-foreground text-sm">Reagendada</span>
                  )}
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
                </Enlace>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

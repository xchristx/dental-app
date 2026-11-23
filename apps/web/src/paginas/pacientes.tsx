import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fechaEnZona } from '@dental/core'
import { FormularioPaciente } from '@/components/pacientes/formulario-paciente'
import { ListaPacientes } from '@/components/pacientes/lista-pacientes'
import { ZONA } from '@/lib/agenda/zona'
import { tituloDePagina } from '@/lib/navegacion'
import { listaDePacientes } from '@/lib/pacientes/datos'

export function PaginaPacientes() {
  useEffect(() => tituloDePagina('Pacientes'), [])
  const pacientes = useQuery({ queryKey: ['pacientes'], queryFn: listaDePacientes })

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 md:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo-pagina">Pacientes</h1>
        <FormularioPaciente />
      </header>

      {pacientes.data ? (
        // La edad depende de la fecha de hoy en La Paz.
        <ListaPacientes pacientes={pacientes.data} hoy={fechaEnZona(new Date(), ZONA)} />
      ) : (
        <EsqueletoLista />
      )}
    </main>
  )
}

// Formas grises fijas, sin animación (docs/diseno.md).
function EsqueletoLista() {
  return (
    <div aria-busy="true" aria-label="Cargando pacientes" className="flex flex-col gap-3">
      <div className="bg-muted h-11 rounded-sm" />
      <div className="bg-muted h-80 rounded-lg" />
    </div>
  )
}

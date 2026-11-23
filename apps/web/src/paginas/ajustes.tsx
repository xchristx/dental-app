import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CatalogoOdontograma } from '@/components/ajustes/catalogo-odontograma'
import { Horarios } from '@/components/ajustes/horarios'
import { Lugares } from '@/components/ajustes/lugares'
import { Profesionales } from '@/components/ajustes/profesionales'
import { SesionUsuario } from '@/components/sesion-usuario'
import { datosDeAjustes } from '@/lib/ajustes/datos'
import { tituloDePagina } from '@/lib/navegacion'

// Lo que se carga una vez: lugares, profesionales y horarios para la agenda
// (0004 y 0014), y los códigos del odontograma (0022).
export function PaginaAjustes() {
  useEffect(() => tituloDePagina('Ajustes'), [])
  const ajustes = useQuery({ queryKey: ['ajustes'], queryFn: datosDeAjustes })
  const datos = ajustes.data

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8 md:px-6 lg:px-8">
      <h1 className="titulo-pagina">Ajustes</h1>

      {datos ? (
        <>
          <Lugares lugares={datos.lugares} />
          <Profesionales
            profesionales={datos.profesionales}
            profesionalPropia={datos.profesionalPropia}
            esAdmin={datos.esAdmin}
          />
          <Horarios datos={datos} />
          <CatalogoOdontograma esAdmin={datos.esAdmin} />
        </>
      ) : (
        <div aria-busy="true" aria-label="Cargando los ajustes" className="flex flex-col gap-10">
          <div className="bg-muted h-40 rounded-lg" />
          <div className="bg-muted h-72 rounded-lg" />
        </div>
      )}

      {/* En celular y tablet no hay barra lateral: "Salir" está aquí. */}
      <section className="max-w-xs lg:hidden">
        <h2 className="mb-3 text-lg font-medium">Tu sesión</h2>
        <SesionUsuario />
      </section>
    </main>
  )
}

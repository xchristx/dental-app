import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { esFechaValida, fechaEnZona, lunesDeLaSemana } from '@dental/core'
import { AgendaSemana, esDeLaSemana } from '@/components/agenda/agenda-semana'
import { opcionesParaAgendar } from '@/lib/agenda/opciones'
import { consultaSemana, precargarSemanasVecinas } from '@/lib/agenda/semana'
import { ZONA } from '@/lib/agenda/zona'
import { tituloDePagina, useParametro } from '@/lib/navegacion'

// Agenda: día en el celular, semana desde tablet (decisión 0009).
// La fecha va en la URL (?fecha=2026-11-19) para que se pueda compartir y
// para que "atrás" del navegador funcione.
export function PaginaAgenda() {
  useEffect(() => tituloDePagina(), [])
  const valor = useParametro('fecha')
  const hoy = fechaEnZona(new Date(), ZONA)
  const pedida = esFechaValida(valor) ? valor : hoy
  const lunes = lunesDeLaSemana(pedida)

  // Mientras llega otra semana, se sigue viendo la anterior (atenuada).
  const semana = useQuery({ ...consultaSemana(lunes), placeholderData: keepPreviousData })
  const opciones = useQuery({ queryKey: ['opciones'], queryFn: opcionesParaAgendar })
  const cargando = semana.isPlaceholderData

  useEffect(() => {
    if (!cargando) precargarSemanasVecinas(lunes)
  }, [lunes, cargando])

  // El día que se ve: el que pide la URL, salvo mientras carga otra semana,
  // que queda el último que se vio (guardar lo de la vez anterior es el
  // patrón de React para estado que depende de las props).
  const [ultimaVista, setUltimaVista] = useState(pedida)
  if (!cargando && semana.data && ultimaVista !== pedida) setUltimaVista(pedida)

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8 lg:py-8">
      {semana.data && opciones.data ? (
        <AgendaSemana
          citas={semana.data.citas}
          enlaces={semana.data.enlaces}
          opciones={opciones.data}
          lunes={semana.data.lunes}
          hoy={hoy}
          fecha={
            esDeLaSemana(pedida, semana.data.lunes)
              ? pedida
              : esDeLaSemana(ultimaVista, semana.data.lunes)
                ? ultimaVista
                : semana.data.lunes
          }
          cargando={cargando}
        />
      ) : (
        <EsqueletoAgenda />
      )}
    </main>
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

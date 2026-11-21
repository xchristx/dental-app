import { Suspense } from 'react'
import { connection } from 'next/server'
import { esFechaValida, fechaEnZona, lunesDeLaSemana } from '@dental/core'
import { AgendaSemana } from '@/components/agenda/agenda-semana'
import { ZONA, citasDeLaSemana, enlacesDeLaSemana } from '@/lib/agenda/datos'
import { opcionesParaAgendar } from '@/lib/agenda/opciones'

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
  const enlaces = await enlacesDeLaSemana(citas)

  // El día que se ve y el detalle de una cita se eligen en el navegador, sin ir
  // al servidor (AgendaSemana). Cambiar de semana sí vuelve a pedir las citas.
  return (
    <AgendaSemana
      citas={citas}
      enlaces={enlaces}
      opciones={opciones}
      lunes={lunes}
      hoy={hoy}
      fechaInicial={fecha}
    />
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

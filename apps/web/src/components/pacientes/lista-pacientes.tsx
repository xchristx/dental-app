'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CaretRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react'
import { coincideBusqueda, edad, type Fecha } from '@dental/core'
import type { PacienteLista } from '@/lib/pacientes/datos'

/** Lista de pacientes con búsqueda sin tildes. `hoy` viene del servidor, para calcular la edad. */
export function ListaPacientes({ pacientes, hoy }: { pacientes: PacienteLista[]; hoy: Fecha }) {
  const [busqueda, setBusqueda] = useState('')
  const visibles = useMemo(
    () => pacientes.filter((p) => coincideBusqueda(p.nombre, busqueda)),
    [pacientes, busqueda],
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlassIcon
          weight="bold"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <input
          type="search"
          aria-label="Buscar paciente"
          placeholder="Buscar por nombre"
          autoComplete="off"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border-input bg-card focus-visible:ring-ring/40 h-11 w-full rounded-sm border pr-3 pl-9 text-base outline-none focus-visible:ring-3"
        />
      </div>

      <p className="text-muted-foreground text-sm" aria-live="polite">
        {busqueda.trim()
          ? `${visibles.length} de ${pacientes.length} pacientes`
          : `${pacientes.length} pacientes`}
      </p>

      {visibles.length > 0 ? (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border">
          {visibles.map((p) => {
            const anios = edad(p.fechaNacimiento, hoy)
            return (
              <li key={p.id}>
                <Link
                  href={`/pacientes/${p.id}`}
                  className="hover:bg-muted flex min-h-14 items-center gap-3 px-3 py-2 transition-colors duration-150"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.nombre}</p>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      {[p.telefono ?? 'Sin celular', anios !== null ? `${anios} años` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <CaretRightIcon weight="bold" className="text-muted-foreground size-4" />
                </Link>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          {pacientes.length === 0
            ? 'Todavía no hay pacientes. Se agregan aquí o al agendar una cita.'
            : 'Nadie con ese nombre.'}
        </p>
      )}
    </div>
  )
}

import { describe, expect, it } from 'vitest'
import { EstadoCita, ocupaAgenda } from './estados'

describe('ocupaAgenda', () => {
  it('solo agendada, confirmada y atendida ocupan el espacio', () => {
    const ocupan = EstadoCita.options.filter(ocupaAgenda)
    expect(ocupan).toEqual(['agendada', 'confirmada', 'atendida'])
  })
})

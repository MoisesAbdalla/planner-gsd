import { describe, expect, test } from 'vitest'
import { APP_TIME_ZONE, monthKeyOf, toCalendarDate } from '../src/shared/date'

describe('toCalendarDate (D-24 — data de calendário em America/Sao_Paulo)', () => {
  test('APP_TIME_ZONE é America/Sao_Paulo', () => {
    expect(APP_TIME_ZONE).toBe('America/Sao_Paulo')
  })

  test('instante correspondente a 31/08/2026 23:30 em America/Sao_Paulo resolve para 2026-08-31', () => {
    // 2026-08-31T23:30:00 em America/Sao_Paulo (UTC-3) == 2026-09-01T02:30:00Z
    const instant = new Date('2026-09-01T02:30:00.000Z')
    expect(toCalendarDate(instant)).toBe('2026-08-31')
  })

  test('o mesmo instante não escorrega para 2026-09-01 (prova de que não é UTC bruto)', () => {
    const instant = new Date('2026-09-01T02:30:00.000Z')
    // A data UTC bruta desse instante É 2026-09-01 — se toCalendarDate usasse UTC
    // ingenuamente, ele bateria com isto. O teste anterior prova que ele NÃO bate.
    expect(instant.toISOString().slice(0, 10)).toBe('2026-09-01')
    expect(toCalendarDate(instant)).not.toBe('2026-09-01')
  })
})

describe('monthKeyOf', () => {
  test('monthKeyOf("2026-08-31") retorna "2026-08"', () => {
    expect(monthKeyOf('2026-08-31')).toBe('2026-08')
  })
})

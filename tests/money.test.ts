import { describe, expect, test } from 'vitest'
import { formatCents, parseBRLToCents } from '../src/shared/money'

describe('formatCents (D-23 — centavos inteiros, formatação pt-BR)', () => {
  test('formata 3250 centavos como R$ 32,50', () => {
    expect(formatCents(3250)).toBe('R$ 32,50')
  })

  test('formata zero como R$ 0,00', () => {
    expect(formatCents(0)).toBe('R$ 0,00')
  })

  test('formata valor negativo em pt-BR', () => {
    expect(formatCents(-1250)).toBe('-R$ 12,50')
  })
})

describe('parseBRLToCents', () => {
  test('converte "32,50" em 3250', () => {
    expect(parseBRLToCents('32,50')).toBe(3250)
  })

  test('retorna null para entrada inválida', () => {
    expect(parseBRLToCents('abc')).toBeNull()
  })
})

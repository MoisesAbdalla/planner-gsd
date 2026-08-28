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

  // CR-01: pt-BR não tem ponto decimal — '.' é SEMPRE milhar, ',' é SEMPRE
  // decimal. Valores explícitos abaixo, não derivados da implementação.
  test('trata "1.234" (sem vírgula) como mil duzentos e trinta e quatro reais', () => {
    expect(parseBRLToCents('1.234')).toBe(123400)
  })

  test('trata "1.500" (sem vírgula) como mil e quinhentos reais', () => {
    expect(parseBRLToCents('1.500')).toBe(150000)
  })

  test('remove múltiplos separadores de milhar em "1.234.567"', () => {
    expect(parseBRLToCents('1.234.567')).toBe(123456700)
  })

  test('converte "1.234,56" (milhar + decimal) em 123456', () => {
    expect(parseBRLToCents('1.234,56')).toBe(123456)
  })

  test('converte "1234" (sem separador) em 123400', () => {
    expect(parseBRLToCents('1234')).toBe(123400)
  })

  test('converte "12,34" em 1234', () => {
    expect(parseBRLToCents('12,34')).toBe(1234)
  })

  test('converte "0,99" em 99', () => {
    expect(parseBRLToCents('0,99')).toBe(99)
  })

  test('converte "R$ 1.500,00" (com prefixo de moeda) em 150000', () => {
    expect(parseBRLToCents('R$ 1.500,00')).toBe(150000)
  })

  test('retorna null para string vazia', () => {
    expect(parseBRLToCents('')).toBeNull()
  })

  test('retorna null para apenas "-"', () => {
    expect(parseBRLToCents('-')).toBeNull()
  })

  test('converte "-12,34" (negativo) em -1234', () => {
    expect(parseBRLToCents('-12,34')).toBe(-1234)
  })

  test('arredonda quando há mais de 2 dígitos decimais: "12,345" em 1235', () => {
    expect(parseBRLToCents('12,345')).toBe(1235)
  })
})

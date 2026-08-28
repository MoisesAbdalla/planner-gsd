// Convenção D-23: dinheiro é sempre inteiro em centavos (`amountCents`) em
// todo o código. A conversão para Real (R$) acontece só aqui, na exibição.
// Nunca usar `number` fracionário para representar dinheiro em nenhuma outra
// camada — Dinero.js entra na Fase 2 para a aritmética (somas, alocação de
// parcelas); esta fase só fixa a convenção de armazenamento e a formatação.

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Intl.NumberFormat('pt-BR', { style: 'currency' }) insere um espaço NÃO
// separável (U+00A0) entre "R$" e o valor. Normalizamos para espaço comum:
// evita bugs de comparação/grep por caractere invisível em toda a base, sem
// mudar nada visualmente para quem lê a tela.
const NBSP = String.fromCharCode(0x00a0)

export function formatCents(amountCents: number): string {
  return currencyFormatter.format(amountCents / 100).split(NBSP).join(' ')
}

// Regex construídas com o construtor `RegExp` (não literais `/.../`) para
// evitar qualquer ambiguidade de escaping de barra invertida na fonte.
const NOT_DIGIT_COMMA_DOT_MINUS = new RegExp('[^0-9,.\\-]', 'g')
const LITERAL_DOT = new RegExp('[.]', 'g')

export function parseBRLToCents(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  // Mantém só dígitos, vírgula, ponto e sinal de menos.
  const stripped = trimmed.replace(NOT_DIGIT_COMMA_DOT_MINUS, '')
  if (stripped === '' || stripped === '-') return null

  // pt-BR não tem ponto decimal: '.' é SEMPRE separador de milhar (descartado),
  // ',' é SEMPRE o separador decimal quando presente. Remover todos os pontos
  // primeiro, depois tratar a vírgula (se houver) como decimal — nunca
  // adivinhar notação inglesa a partir da ausência de vírgula (CR-01).
  const withoutThousands = stripped.replace(LITERAL_DOT, '')
  const normalized = withoutThousands.includes(',')
    ? withoutThousands.replace(',', '.')
    : withoutThousands

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null

  return Math.round(value * 100)
}

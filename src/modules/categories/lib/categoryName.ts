// Normalização e comparação de nome de categoria (CAT-02/CAT-03 encoding).
// Nomes em pt-BR carregam acentos — normalizar em Unicode NFC e comparar em
// caixa dobrada evita que dois nomes visualmente idênticos (formas NFC e
// NFD do mesmo caractere acentuado, ou só a diferença de maiúscula/
// minúscula) sejam tratados como distintos. Espaços das pontas são
// removidos e espaços internos repetidos são colapsados a um só — "Mercado"
// e "  Mercado  " ou "Mercado   Livre" e "Mercado Livre" comparam iguais.
//
// A duplicidade é um AVISO DE INTERFACE sobre o que o listener conhece
// AGORA, nunca uma trava de banco — a regra do servidor (plano 01-04) não
// checa unicidade de nome. Dois membros criando categorias de mesmo nome ao
// mesmo tempo produzem dois documentos distintos, por desenho (D-21).
export function normalizeCategoryName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase()
}

export function isDuplicateName(
  candidate: string,
  categories: ReadonlyArray<{ id: string; name: string }>,
  ignoreId?: string,
): boolean {
  const normalizedCandidate = normalizeCategoryName(candidate)
  if (!normalizedCandidate) return false

  return categories.some(
    (category) =>
      category.id !== ignoreId && normalizeCategoryName(category.name) === normalizedCandidate,
  )
}

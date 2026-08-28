// Paleta fixa de 12 cores de categoria (D-10), transcrita de
// 01-UI-SPEC.md §Category Color Palette — 11 tons cromáticos + "outros"
// (cinza neutro, nunca um matiz saturado, para não competir visualmente
// com as 11 categorias que carregam sinal de fato).
//
// Uso obrigatório (UI-SPEC): a cor de categoria é sempre ponto/dot, ícone
// tintado ou fatia de gráfico — nunca fundo preenchido com texto por cima.
// O nome da categoria sempre acompanha a cor por escrito (cor nunca é o
// único portador de significado).
//
// Consumido pelo plano 01-04 (seeding das 12 categorias no Firestore) e
// por qualquer tela das Fases 2+ que precise resolver a cor de uma
// categoria por id.

export const CATEGORY_COLOR_ORDER = [
  'mercado',
  'alimentacao',
  'transporte',
  'moradia',
  'saude',
  'lazer',
  'assinaturas',
  'educacao',
  'vestuario',
  'pets',
  'presentes',
  'outros',
] as const

export type CategoryColorId = (typeof CATEGORY_COLOR_ORDER)[number]

// Par claro/escuro de uma cor de categoria. Tipo nomeado em vez de um
// literal inline no Record abaixo, para que a contagem de tons no arquivo
// reflita só as 12 entradas de dado, não a assinatura de tipo.
export type CategoryColorPair = Record<'light' | 'dark', string>

export const CATEGORY_COLOR_TOKENS: Record<CategoryColorId, CategoryColorPair> = {
  mercado: { light: 'hsl(111 32% 36%)', dark: 'hsl(111 30% 62%)' },
  alimentacao: { light: 'hsl(331 42% 46%)', dark: 'hsl(331 45% 68%)' },
  transporte: { light: 'hsl(201 40% 42%)', dark: 'hsl(201 42% 66%)' },
  moradia: { light: 'hsl(65 38% 32%)', dark: 'hsl(65 40% 58%)' },
  saude: { light: 'hsl(134 30% 34%)', dark: 'hsl(134 28% 60%)' },
  lazer: { light: 'hsl(279 32% 46%)', dark: 'hsl(279 35% 70%)' },
  assinaturas: { light: 'hsl(175 35% 32%)', dark: 'hsl(175 32% 58%)' },
  educacao: { light: 'hsl(88 30% 30%)', dark: 'hsl(88 28% 56%)' },
  vestuario: { light: 'hsl(305 38% 46%)', dark: 'hsl(305 40% 68%)' },
  pets: { light: 'hsl(227 36% 44%)', dark: 'hsl(227 38% 68%)' },
  presentes: { light: 'hsl(253 34% 46%)', dark: 'hsl(253 36% 70%)' },
  // "Outros" — cinza neutro deliberado, nunca um dos 11 tons cromáticos.
  outros: { light: 'hsl(30 8% 42%)', dark: 'hsl(30 6% 62%)' },
}

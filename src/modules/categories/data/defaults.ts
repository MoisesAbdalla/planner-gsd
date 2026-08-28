// As 12 categorias padrão (CAT-01, D-09) — nomes verbatim de
// 01-CONTEXT.md linha 33, acentuação preservada. `id` é o slug sem acento
// usado como ID DETERMINÍSTICO do documento (é o que torna o seeding
// idempotente — ver seed.ts), e `color` referencia o id de um dos 12 tons
// de src/shared/theme/tokens.ts (CATEGORY_COLOR_TOKENS) — nunca redecide a
// cor aqui. A ordem desta lista é a mesma ordem de atribuição de cor da
// tabela "Category Color Palette" do UI-SPEC, idêntica a
// CATEGORY_COLOR_ORDER — "Outros" é sempre a última e sempre recebe o tom
// neutro (D-10), nunca um dos 11 tons cromáticos.
import type { CategoryColorId } from '../../../shared/theme/tokens'

export type DefaultCategory = {
  id: CategoryColorId
  name: string
  color: CategoryColorId
  canArchive: boolean
}

export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { id: 'mercado', name: 'Mercado', color: 'mercado', canArchive: true },
  { id: 'alimentacao', name: 'Alimentação', color: 'alimentacao', canArchive: true },
  { id: 'transporte', name: 'Transporte', color: 'transporte', canArchive: true },
  { id: 'moradia', name: 'Moradia', color: 'moradia', canArchive: true },
  { id: 'saude', name: 'Saúde', color: 'saude', canArchive: true },
  { id: 'lazer', name: 'Lazer', color: 'lazer', canArchive: true },
  { id: 'assinaturas', name: 'Assinaturas', color: 'assinaturas', canArchive: true },
  { id: 'educacao', name: 'Educação', color: 'educacao', canArchive: true },
  { id: 'vestuario', name: 'Vestuário', color: 'vestuario', canArchive: true },
  { id: 'pets', name: 'Pets', color: 'pets', canArchive: true },
  { id: 'presentes', name: 'Presentes', color: 'presentes', canArchive: true },
  // "Outros" nunca pode ser arquivada (canArchive: false) — trava também
  // reforçada em firestore.rules (defesa em profundidade), nunca só aqui.
  { id: 'outros', name: 'Outros', color: 'outros', canArchive: false },
]

// Seeding idempotente das 12 categorias padrão (CAT-01, D-09).
//
// Resumo do experimento do Open Question 2 de 01-RESEARCH.md (registrado em
// detalhe no SUMMARY desta execução): tentar criar, num único writeBatch, o
// documento do workspace E uma categoria filha cuja regra de create depende
// de isMember(workspaceId) (get() no pai) É NEGADO pelo Firestore Emulator
// — get() dentro de uma regra avaliada em batch vê o estado anterior ao
// batch inteiro, então o workspace "ainda não existe" do ponto de vista da
// regra da categoria, mesmo estando no mesmo batch. Isso CONFIRMA que a
// separação em dois passos sequenciais aguardados (bootstrap.ts: workspace
// primeiro, seedDefaultCategories depois) não é apenas conservadora — é
// estritamente necessária.
//
// IDs determinísticos (o slug de cada categoria, nunca um ID automático) são
// o que torna esta função idempotente e resumível: em vez de sempre
// escrever as 12, ela lê que categorias já existem e só cria as que
// faltam. Rodar duas vezes seguidas é um no-op na segunda chamada
// (contagem continua 12, createdAt do primeiro run nunca é tocado).
// Apagar algumas e rodar de novo completa só as que faltam, sem duplicar
// nem sobrescrever as que sobraram — é a mitigação direta da janela em que
// o app pode crashar entre criar o workspace e terminar de semear
// (01-RESEARCH.md §Pitfall: seeding no mesmo batch).
import {
  getDocs,
  serverTimestamp,
  writeBatch,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { db } from '../../../shared/firebase/client'
import { DEFAULT_CATEGORIES } from './defaults'
import { categoriesCollection, categoryDoc, type Category } from './refs'

export async function seedDefaultCategories(workspaceId: string): Promise<void> {
  const firestore: Firestore = db

  const existingSnap = await getDocs(categoriesCollection(workspaceId))
  const existingIds = new Set(existingSnap.docs.map((d) => d.id))

  const missing = DEFAULT_CATEGORIES.filter((category) => !existingIds.has(category.id))
  if (missing.length === 0) return

  const batch = writeBatch(firestore)
  for (const category of missing) {
    // `id` não é um campo armazenado (vem do próprio ID do documento) —
    // ver comentário em refs.ts sobre por que a escrita usa
    // Omit<Category, 'id'> em vez do tipo Category completo.
    const ref = categoryDoc(workspaceId, category.id) as unknown as DocumentReference<
      Omit<Category, 'id'>
    >
    batch.set(ref, {
      name: category.name,
      color: category.color,
      isSystemDefault: true,
      canArchive: category.canArchive,
      archivedAt: null,
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

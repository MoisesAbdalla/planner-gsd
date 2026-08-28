// Criar, editar e arquivar categoria — SEM atualização otimista (UI-SPEC,
// decisão transversal: "o valor exibido só muda depois que a gravação
// confirma"). Nenhuma das três funções abaixo guarda estado local de
// categoria nenhum — a única fonte da lista é o listener de
// useCategories.ts (onSnapshot). Todas devolvem promessa e propagam a
// rejeição; quem consome (plano 01-06) transforma a rejeição no toast
// global "Não deu para salvar. Tenta de novo?" (Copywriting Contract).
//
// archiveCategory é sempre uma ATUALIZAÇÃO (define archivedAt), nunca uma
// exclusão — não existe caminho de código nesta camada capaz de apagar uma
// categoria (D-11, CAT-04, `must_haves.prohibitions` do plano 01-04); a
// regra da Task 1 também nega delete para qualquer chamador.
import {
  addDoc,
  serverTimestamp,
  updateDoc,
  type CollectionReference,
  type DocumentReference,
  type UpdateData,
} from 'firebase/firestore'
import { categoriesCollection, categoryDoc, type Category } from '../data/refs'

// `id` não é um campo armazenado (vem do próprio ID do documento) — ver
// comentário em refs.ts. As escritas abaixo usam Omit<Category, 'id'>.
type CategoryData = Omit<Category, 'id'>

export async function createCategory(
  workspaceId: string,
  input: { name: string; color: string },
): Promise<string> {
  const colRef = categoriesCollection(
    workspaceId,
  ) as unknown as CollectionReference<CategoryData>

  const ref = await addDoc(colRef, {
    name: input.name,
    color: input.color,
    isSystemDefault: false,
    canArchive: true,
    archivedAt: null,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateCategory(
  workspaceId: string,
  categoryId: string,
  patch: { name?: string; color?: string },
): Promise<void> {
  const ref = categoryDoc(workspaceId, categoryId) as unknown as DocumentReference<CategoryData>
  await updateDoc(ref, patch as UpdateData<CategoryData>)
}

export async function archiveCategory(workspaceId: string, categoryId: string): Promise<void> {
  const ref = categoryDoc(workspaceId, categoryId) as unknown as DocumentReference<CategoryData>
  await updateDoc(ref, { archivedAt: serverTimestamp() } as UpdateData<CategoryData>)
}

// Referências tipadas da subcoleção de categorias (D-25: workspaceId no
// path, nunca só como campo). Nenhuma função deste módulo aceita um
// workspaceId que não venha do useWorkspace() resolvido a partir de
// /users/{uid} — quem chama é sempre um consumidor já dentro do espaço
// (plano 01-06).
//
// Os dois refs abaixo são tipados como CollectionReference<Category> /
// DocumentReference<Category> pelo contrato de <interfaces> do plano
// 01-04, para conveniência de LEITURA de quem consome (01-06). Escritas de
// produção (seed.ts, hooks/useCategoryMutations.ts) usam doc()/collection()
// não tipados diretamente — mesmo padrão já estabelecido em
// src/features/invite/data/invites.ts (inviteRef tipado para leitura,
// setDoc usa doc() puro) — porque `Category.id` não é um campo armazenado
// de verdade (vem de snap.id), e forçar esse campo em todo payload de
// escrita só criaria atrito de tipo sem benefício.
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/firebase/client'

export type Category = {
  id: string
  name: string
  color: string
  isSystemDefault: boolean
  canArchive: boolean
  archivedAt: Timestamp | null
  createdAt: Timestamp
}

export function categoriesCollection(workspaceId: string): CollectionReference<Category> {
  const firestore: Firestore = db
  return collection(
    firestore,
    'workspaces',
    workspaceId,
    'categories',
  ) as unknown as CollectionReference<Category>
}

export function categoryDoc(
  workspaceId: string,
  categoryId: string,
): DocumentReference<Category> {
  const firestore: Firestore = db
  return doc(
    firestore,
    'workspaces',
    workspaceId,
    'categories',
    categoryId,
  ) as unknown as DocumentReference<Category>
}

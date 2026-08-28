// Fluxo de primeiro login sem convite (AUTH-03, 01-RESEARCH.md §Fluxo de
// primeiro login). O nome padrão do espaço é discricionário (Assumptions Log
// A1) e vira editável a partir do plano 01-04 (D-08).
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  writeBatch,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/client'

export type Workspace = {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
  createdAt: Timestamp
}

const DEFAULT_WORKSPACE_NAME = 'Nosso espaço'

export async function resolveUserWorkspace(uid: string): Promise<string | null> {
  const firestore: Firestore = db
  const userSnap = await getDoc(doc(firestore, 'users', uid))
  if (!userSnap.exists()) return null

  const workspaceId = userSnap.data().workspaceId
  return typeof workspaceId === 'string' ? workspaceId : null
}

export async function bootstrapNewWorkspace(uid: string): Promise<string> {
  const firestore: Firestore = db

  // Idempotência (AUTH-01/AUTH-03): se o usuário já tem um espaço, devolve
  // cedo em vez de criar outro.
  const existingWorkspaceId = await resolveUserWorkspace(uid)
  if (existingWorkspaceId) return existingWorkspaceId

  const workspaceRef = doc(collection(firestore, 'workspaces'))

  // Único writeBatch: nem a regra de /workspaces/{id} nem a de /users/{uid}
  // fazem get() na outra dentro desta escrita, então não há a corrida
  // descrita em 01-RESEARCH.md §Pitfall (seeding de categorias É separado —
  // chega no plano 01-04, nunca neste batch).
  const batch = writeBatch(firestore)
  batch.set(workspaceRef, {
    name: DEFAULT_WORKSPACE_NAME,
    ownerId: uid,
    memberIds: [uid],
    createdAt: serverTimestamp(),
  })
  batch.set(doc(firestore, 'users', uid), { workspaceId: workspaceRef.id })
  await batch.commit()

  return workspaceRef.id
}

// Geração do convite (AUTH-04). O token é o próprio ID do documento em
// /invites/{token} — coleção de nível raiz, nunca subcoleção do workspace
// (01-RESEARCH.md §O desenho central §1; ver firestore.rules, plano 01-02
// Task 1). crypto.randomUUID() dá 122 bits de entropia, API nativa do
// browser, sem dependência nova (D-02, "Don't Hand-Roll": nunca
// Math.random() para isto).
import {
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'
import { db } from '../../../shared/firebase/client'

export const INVITE_TTL_DAYS = 7

export type Invite = {
  workspaceId: string
  createdBy: string
  createdAt: Timestamp
  expiresAt: Timestamp
  status: 'pending' | 'used'
  usedBy: string | null
  usedAt: Timestamp | null
}

export function inviteRef(token: string): DocumentReference<Invite> {
  const firestore: Firestore = db
  return doc(firestore, 'invites', token) as unknown as DocumentReference<Invite>
}

/**
 * Cria um convite pendente para workspaceId, gerado por uid, válido por
 * INVITE_TTL_DAYS. Devolve o token — que é também o ID do documento criado.
 *
 * Nota sobre expiresAt: firestore.rules compara expiresAt contra uma FAIXA
 * em torno de request.time (request.time < expiresAt < request.time + 8
 * dias), não uma igualdade estrita com request.time + duration.value(7,'d')
 * — o cliente não tem como prever o instante exato em que o servidor vai
 * avaliar request.time no commit, então essa igualdade estrita seria
 * impraticável de satisfazer de forma confiável a partir daqui. A checagem
 * de prazo nunca é removida por inteiro. Ver SUMMARY desta execução.
 */
export async function createInvite(workspaceId: string, uid: string): Promise<string> {
  const firestore: Firestore = db
  const token = crypto.randomUUID()
  const expiresAt = Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await setDoc(doc(firestore, 'invites', token), {
    workspaceId,
    createdBy: uid,
    createdAt: serverTimestamp(),
    expiresAt,
    status: 'pending',
    usedBy: null,
    usedAt: null,
  })

  return token
}

/** Monta o link pronto para compartilhar (D-01) — um único identificador na URL. */
export function inviteUrl(token: string): string {
  return `${window.location.origin}/entrar?convite=${token}`
}

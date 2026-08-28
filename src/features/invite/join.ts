// Resgate transacional do convite (AUTH-05) — a operação mais crítica desta
// fase. runTransaction() com tx.get() explícito é OBRIGATÓRIO (nunca uma
// escrita em lote): é o que dá a garantia de controle de concorrência
// otimista do Firestore contra duas pessoas resgatando o mesmo token quase
// ao mesmo tempo (01-RESEARCH.md §3, Pitfall 3; ver <prohibitions> do plano
// 01-02).
import {
  arrayUnion,
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../../shared/firebase/client'
import { resolveUserWorkspace } from '../../shared/workspace/bootstrap'

export type JoinInviteErrorCode =
  | 'invite-not-found'
  | 'invite-already-used'
  | 'invite-expired'
  | 'already-in-workspace'
  // WR-04: falha genérica/não classificada (rede, permissão negada por um
  // motivo diferente da corrida de resgate concorrente, etc.) — nunca
  // reaproveita a cópia de 'invite-already-used' para algo que pode não
  // ter nada a ver com o convite já ter sido usado.
  | 'unknown'

export class JoinInviteError extends Error {
  code: JoinInviteErrorCode

  constructor(code: JoinInviteErrorCode) {
    super(code)
    this.code = code
    this.name = 'JoinInviteError'
  }
}

/**
 * Resgata um convite e devolve o workspaceId de entrada.
 *
 * Risco residual aceito conscientemente (T-01-08, low/accept,
 * 01-RESEARCH.md §3/§5): o get() usado pela Security Rule para validar o
 * convite não tem a mesma garantia formal de participar do controle de
 * concorrência otimista que o tx.get() do cliente tem — existe uma janela
 * teórica extremamente estreita em que dois chamadores que burlem
 * deliberadamente o SDK de transação (requisições REST cruas e
 * desacopladas, não agrupadas numa transação real) poderiam ambos ler o
 * convite ainda pendente. Para um app privado de duas pessoas, sem
 * exposição pública, esse risco é aceito. A correção formal exigiria uma
 * Cloud Function `redeemInvite` fazendo a mesma transação com o Admin SDK —
 * o que exige o plano Blaze, fora de escopo por D-06.
 */
export async function joinWorkspace(token: string, uid: string): Promise<string> {
  // Capturado sincronamente, ANTES de qualquer await: garante que esta
  // chamada usa uma única instância de Firestore do início ao fim, mesmo
  // que o singleton `db` mude de valor entre o início desta função e o
  // commit da transação. Sem isso, dois resgates concorrentes com
  // instâncias de teste diferentes (tests/invite.test.ts troca `db` por
  // contexto autenticado) poderiam se contaminar; em produção o singleton
  // nunca muda, então este cuidado é invisível ali.
  const firestore: Firestore = db

  const existingWorkspaceId = await resolveUserWorkspace(uid)
  if (existingWorkspaceId) {
    throw new JoinInviteError('already-in-workspace')
  }

  try {
    return await runTransaction(firestore, async (tx) => {
      const inviteRef = doc(firestore, 'invites', token)

      // OBRIGATÓRIO: tx.get(), nunca getDoc() solto nem escrita em lote —
      // é isso que dá a garantia de OCC do Firestore contra resgate
      // concorrente do mesmo token (01-RESEARCH.md §3).
      const inviteSnap = await tx.get(inviteRef)
      if (!inviteSnap.exists()) {
        throw new JoinInviteError('invite-not-found')
      }

      const invite = inviteSnap.data()
      if (invite.status !== 'pending') {
        throw new JoinInviteError('invite-already-used')
      }
      if ((invite.expiresAt as Timestamp).toMillis() < Date.now()) {
        throw new JoinInviteError('invite-expired')
      }

      const workspaceId = invite.workspaceId as string
      const workspaceRef = doc(firestore, 'workspaces', workspaceId)

      tx.update(inviteRef, {
        status: 'used',
        usedBy: uid,
        usedAt: serverTimestamp(),
      })
      tx.update(workspaceRef, {
        memberIds: arrayUnion(uid),
        joinToken: token,
      })
      tx.set(doc(firestore, 'users', uid), { workspaceId })

      return workspaceId
    })
  } catch (error) {
    if (error instanceof JoinInviteError) {
      throw error
    }
    // Corrida de resgate concorrente confirmada empiricamente contra o
    // emulador (tests/invite.test.ts): a Security Rule do workspace resolve
    // o convite com o SEU PRÓPRIO get(), avaliado contra o estado do
    // servidor no momento do commit — não contra o snapshot que o tx.get()
    // desta transação leu. Se outra transação venceu a corrida entre a
    // leitura daqui e o commit desta, esse get() da regra já enxerga o
    // convite 'used' e nega a escrita com um erro genérico do Firestore
    // (permission-denied), não com o erro de app lançado acima — o
    // controle de concorrência otimista do cliente (que dispara retry
    // automático) cobre o documento do CONVITE, mas não cobre a avaliação
    // interna da regra do WORKSPACE. Tratado aqui como o mesmo resultado de
    // "já usado" para quem chama; é o risco residual documentado como
    // aceito em 01-RESEARCH.md §3/§5 (T-01-08).
    //
    // WR-04: essa reclassificação só vale para a FORMA especificamente
    // confirmada acima — um FirebaseError com code 'permission-denied'.
    // Antes, QUALQUER erro não-JoinInviteError (rede caindo, o emulador/
    // servidor fora do ar, um bug em outro lugar) virava 'invite-already-
    // used', mostrando a cópia errada para o usuário numa janela de corrida
    // completamente diferente. Erros com qualquer outra forma sobem como
    // 'unknown', que a UI renderiza com a cópia genérica de erro do
    // Copywriting Contract — nunca inventa "já foi usado" para uma causa
    // que pode não ter nada a ver com o convite.
    if (isFirestorePermissionDenied(error)) {
      throw new JoinInviteError('invite-already-used')
    }
    throw new JoinInviteError('unknown')
  }
}

function isFirestorePermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'permission-denied'
  )
}

// WR-04 (01-REVIEW.md): join.ts reclassificava QUALQUER erro não-
// JoinInviteError vindo de runTransaction como 'invite-already-used' — a
// forma empiricamente confirmada (comentário em join.ts, T-01-08) é
// especificamente um FirebaseError com code 'permission-denied', não
// qualquer falha. Este arquivo isola joinWorkspace() do Firestore Emulator
// real (ao contrário de tests/invite.test.ts) mockando `runTransaction`
// diretamente, para poder injetar formas de erro controladas — algo que não
// dá para forçar de forma determinística contra o emulador real.
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/shared/firebase/client', () => ({
  get db() {
    return {}
  },
}))

const resolveUserWorkspaceMock = vi.fn().mockResolvedValue(null)
vi.mock('../src/shared/workspace/bootstrap', () => ({
  resolveUserWorkspace: (...args: unknown[]) => resolveUserWorkspaceMock(...args),
}))

const runTransactionMock = vi.fn()
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    runTransaction: (...args: unknown[]) => runTransactionMock(...args),
  }
})

const { joinWorkspace, JoinInviteError } = await import('../src/features/invite/join')

function firebaseError(code: string, message = code): Error {
  return Object.assign(new Error(message), { code, name: 'FirebaseError' })
}

afterEach(() => {
  runTransactionMock.mockReset()
  resolveUserWorkspaceMock.mockReset().mockResolvedValue(null)
})

describe('joinWorkspace — WR-04, catch-all narrowado', () => {
  test('FirebaseError com code permission-denied (a corrida de resgate concorrente confirmada em T-01-08) ainda vira invite-already-used', async () => {
    runTransactionMock.mockRejectedValueOnce(firebaseError('permission-denied'))

    await expect(joinWorkspace('tok', 'bob')).rejects.toMatchObject({
      code: 'invite-already-used',
    })
  })

  test('erro de rede genérico (sem code permission-denied) vira unknown, não invite-already-used', async () => {
    runTransactionMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const rejection = await joinWorkspace('tok', 'bob').catch((error: unknown) => error)
    expect(rejection).toBeInstanceOf(JoinInviteError)
    expect(rejection).toMatchObject({ code: 'unknown' })
  })

  test('FirebaseError com outro code (ex.: unavailable) também vira unknown, não invite-already-used', async () => {
    runTransactionMock.mockRejectedValueOnce(firebaseError('unavailable'))

    await expect(joinWorkspace('tok', 'bob')).rejects.toMatchObject({ code: 'unknown' })
  })

  test('JoinInviteError lançado dentro da transação (ex.: invite-expired) continua passando direto, sem reclassificação', async () => {
    runTransactionMock.mockRejectedValueOnce(new JoinInviteError('invite-expired'))

    await expect(joinWorkspace('tok', 'bob')).rejects.toMatchObject({
      code: 'invite-expired',
    })
  })
})

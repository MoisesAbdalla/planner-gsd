// Cliente do convite (AUTH-04, AUTH-05) — gerar com token de alta entropia e
// resgatar em transação real. Segue o mesmo padrão de mock de
// tests/bootstrap.test.ts: `db` de src/shared/firebase/client.ts é
// substituído por um getter que devolve `activeDb`, trocada por contexto
// autenticado do emulador — a assinatura pública (uid: string) das funções
// de produção não muda.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { doc, getDoc, setDoc, Timestamp, type Firestore } from 'firebase/firestore'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { withTestEnv } from './rules-harness'

let activeDb: Firestore

vi.mock('../src/shared/firebase/client', () => ({
  get db() {
    return activeDb
  },
}))

const { createInvite, INVITE_TTL_DAYS } = await import('../src/features/invite/data/invites')
const { joinWorkspace, JoinInviteError } = await import('../src/features/invite/join')

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  testEnv = await withTestEnv()
})

afterEach(async () => {
  await testEnv.clearFirestore()
})

afterAll(async () => {
  await testEnv.cleanup()
})

async function seedWorkspace(id: string, ownerId: string) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'workspaces', id), {
      name: 'Espaço de teste',
      ownerId,
      memberIds: [ownerId],
      createdAt: Timestamp.now(),
    })
  })
}

describe('createInvite (AUTH-04)', () => {
  test('devolve um token no formato UUID e cria invites/<token> pending com workspaceId/createdBy corretos e expiresAt ~7 dias à frente', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const token = await createInvite('wsA', 'alice')

    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

    const snap = await getDoc(doc(activeDb, 'invites', token))
    expect(snap.exists()).toBe(true)
    const invite = snap.data()!
    expect(invite.status).toBe('pending')
    expect(invite.workspaceId).toBe('wsA')
    expect(invite.createdBy).toBe('alice')
    expect(invite.usedBy).toBeNull()

    const createdAtMs = (invite.createdAt as Timestamp).toMillis()
    const expiresAtMs = (invite.expiresAt as Timestamp).toMillis()
    const diffDays = (expiresAtMs - createdAtMs) / (24 * 60 * 60 * 1000)
    expect(diffDays).toBeGreaterThan(INVITE_TTL_DAYS - 0.1)
    expect(diffDays).toBeLessThan(INVITE_TTL_DAYS + 0.1)
  })

  test('duas chamadas seguidas geram tokens diferentes, dois documentos, ambos pending (AUTH-04 idempotency/concurrency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const tokenA = await createInvite('wsA', 'alice')
    const tokenB = await createInvite('wsA', 'alice')

    expect(tokenA).not.toBe(tokenB)

    const snapA = await getDoc(doc(activeDb, 'invites', tokenA))
    const snapB = await getDoc(doc(activeDb, 'invites', tokenB))
    expect(snapA.data()?.status).toBe('pending')
    expect(snapB.data()?.status).toBe('pending')
  })
})

describe('joinWorkspace (AUTH-05)', () => {
  test('convite válido: devolve wsA, marca convite used, acrescenta bob a memberIds e cria users/bob', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    const token = await createInvite('wsA', 'alice')

    activeDb = testEnv.authenticatedContext('bob').firestore()
    const workspaceId = await joinWorkspace(token, 'bob')

    expect(workspaceId).toBe('wsA')

    const inviteSnap = await getDoc(doc(activeDb, 'invites', token))
    expect(inviteSnap.data()?.status).toBe('used')
    expect(inviteSnap.data()?.usedBy).toBe('bob')

    const workspaceSnap = await getDoc(doc(activeDb, 'workspaces', 'wsA'))
    expect(workspaceSnap.data()?.memberIds).toContain('bob')

    const userSnap = await getDoc(doc(activeDb, 'users', 'bob'))
    expect(userSnap.exists()).toBe(true)
    expect(userSnap.data()?.workspaceId).toBe('wsA')
  })

  test('resgatar o mesmo token duas vezes: a segunda lança invite-already-used e não duplica bob em memberIds (AUTH-05 idempotency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    const token = await createInvite('wsA', 'alice')

    activeDb = testEnv.authenticatedContext('bob').firestore()
    await joinWorkspace(token, 'bob')

    activeDb = testEnv.authenticatedContext('carol').firestore()
    await expect(joinWorkspace(token, 'carol')).rejects.toMatchObject({
      code: 'invite-already-used',
    })

    // Carol nunca entrou em memberIds (o join foi negado) — lida como bob,
    // que É membro, para não colidir com a própria regra de isolamento
    // sendo testada aqui.
    activeDb = testEnv.authenticatedContext('bob').firestore()
    const workspaceSnap = await getDoc(doc(activeDb, 'workspaces', 'wsA'))
    const memberIds = workspaceSnap.data()?.memberIds as string[]
    expect(memberIds.filter((m) => m === 'bob').length).toBe(1)
    expect(memberIds).not.toContain('carol')
  })

  test('token inexistente lança invite-not-found', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('bob').firestore()

    await expect(joinWorkspace('token-que-nunca-existiu', 'bob')).rejects.toMatchObject({
      code: 'invite-not-found',
    })
  })

  test('convite cujo expiresAt está no passado lança invite-expired', async () => {
    await seedWorkspace('wsA', 'alice')
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'invites/TOKENEXP'), {
        workspaceId: 'wsA',
        createdBy: 'alice',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: Timestamp.fromMillis(Date.now() - 8 * 24 * 60 * 60 * 1000),
        expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      })
    })
    activeDb = testEnv.authenticatedContext('bob').firestore()

    await expect(joinWorkspace('TOKENEXP', 'bob')).rejects.toMatchObject({
      code: 'invite-expired',
    })
  })

  test('uid que já tem /users/{uid} (já pertence a outro espaço) lança already-in-workspace', async () => {
    await seedWorkspace('wsA', 'alice')
    await seedWorkspace('wsB', 'zoe')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    const token = await createInvite('wsA', 'alice')

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/bob'), { workspaceId: 'wsB' })
    })

    activeDb = testEnv.authenticatedContext('bob').firestore()
    await expect(joinWorkspace(token, 'bob')).rejects.toMatchObject({
      code: 'already-in-workspace',
    })
  })

  test('dois resgates concorrentes do mesmo token: exatamente um sucesso e uma rejeição, memberIds ganha exatamente um membro novo (AUTH-05 concurrency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    const token = await createInvite('wsA', 'alice')

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    const carolDb = testEnv.authenticatedContext('carol').firestore()

    const results = await Promise.allSettled([
      (async () => {
        activeDb = bobDb
        return joinWorkspace(token, 'bob')
      })(),
      (async () => {
        activeDb = carolDb
        return joinWorkspace(token, 'carol')
      })(),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(JoinInviteError)

    activeDb = testEnv.authenticatedContext('alice').firestore()
    const workspaceSnap = await getDoc(doc(activeDb, 'workspaces', 'wsA'))
    const memberIds = workspaceSnap.data()?.memberIds as string[]
    expect(memberIds.length).toBe(2)
  })
})

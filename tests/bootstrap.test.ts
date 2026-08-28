import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { withTestEnv } from './rules-harness'

// bootstrap.ts importa `db` de src/shared/firebase/client.ts e usa esse
// singleton em produção (contrato fixo: bootstrapNewWorkspace(uid) e
// resolveUserWorkspace(uid), sem parâmetro extra — ver <interfaces> do plano
// 01-01). Para provar aqui que as Security Rules reais são respeitadas com o
// uid correto (alice, bob), este teste substitui esse `db` pela conexão
// autenticada que @firebase/rules-unit-testing dá para cada contexto — a
// assinatura pública das funções continua exatamente `(uid: string)`.
let activeDb: Firestore

vi.mock('../src/shared/firebase/client', () => ({
  get db() {
    return activeDb
  },
}))

const { bootstrapNewWorkspace, resolveUserWorkspace } = await import(
  '../src/shared/workspace/bootstrap'
)

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

describe('bootstrapNewWorkspace (AUTH-01, AUTH-03)', () => {
  test('cria exatamente um workspace com alice como único membro; users/alice.workspaceId aponta pra ele', async () => {
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const workspaceId = await bootstrapNewWorkspace('alice')

    const workspaceSnap = await getDoc(doc(activeDb, 'workspaces', workspaceId))
    expect(workspaceSnap.exists()).toBe(true)
    const workspace = workspaceSnap.data()!
    expect(workspace.memberIds).toEqual(['alice'])
    expect(workspace.ownerId).toBe('alice')
    expect(typeof workspace.name).toBe('string')
    expect((workspace.name as string).length).toBeGreaterThan(0)

    const userSnap = await getDoc(doc(activeDb, 'users', 'alice'))
    expect(userSnap.exists()).toBe(true)
    expect(userSnap.data()?.workspaceId).toBe(workspaceId)
  })

  test('idempotência: chamar bootstrapNewWorkspace duas vezes deixa exatamente um workspace', async () => {
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const firstId = await bootstrapNewWorkspace('alice')
    const secondId = await bootstrapNewWorkspace('alice')

    expect(secondId).toBe(firstId)

    // Contagem via admin (sem regras): não existe `list` autorizado por
    // membership para "todos os workspaces" — isolamento por design.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await getDocs(collection(ctx.firestore(), 'workspaces'))
      expect(snap.size).toBe(1)
    })
  })
})

describe('resolveUserWorkspace', () => {
  test('retorna null quando users/bob não existe', async () => {
    activeDb = testEnv.authenticatedContext('bob').firestore()

    const result = await resolveUserWorkspace('bob')

    expect(result).toBeNull()
  })
})

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { withTestEnv } from './rules-harness'

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

describe('acesso não autenticado (AUTH-07 — base)', () => {
  test('usuário não autenticado é negado ao ler workspaces/wsA', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anonDb, 'workspaces/wsA')))
  })

  test('usuário não autenticado é negado ao escrever workspaces/wsA', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore()
    await assertFails(
      setDoc(doc(anonDb, 'workspaces/wsA'), {
        name: 'Casa',
        ownerId: 'someone',
        memberIds: ['someone'],
      }),
    )
  })
})

describe('isolamento por membership (AUTH-07, T-01-04)', () => {
  test('alice lê workspaces/wsA do qual é membro; bob, que não é membro, é negado', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), {
        name: 'Casa',
        ownerId: 'alice',
        memberIds: ['alice'],
        createdAt: Timestamp.now(),
      })
    })

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(aliceDb, 'workspaces/wsA')))

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(bobDb, 'workspaces/wsA')))
  })
})

describe('criação de workspace exige memberIds == [uid do chamador] (T-01-13)', () => {
  test('bob é negado ao criar workspaces/wsB com memberIds contendo um uid diferente do seu', async () => {
    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      setDoc(doc(bobDb, 'workspaces/wsB'), {
        name: 'Casa da Bob',
        ownerId: 'bob',
        memberIds: ['someone-else'],
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('users/{uid}.workspaceId é imutável (AUTH-01 concurrency, T-01-12)', () => {
  test('segunda escrita de users/alice com workspaceId diferente é negada', async () => {
    const aliceDb = testEnv.authenticatedContext('alice').firestore()

    await assertSucceeds(setDoc(doc(aliceDb, 'users/alice'), { workspaceId: 'wsA' }))
    await assertFails(setDoc(doc(aliceDb, 'users/alice'), { workspaceId: 'wsB' }))
  })
})

describe('workspace nunca pode ser deletado', () => {
  test('delete em workspaces/wsA é negado para qualquer chamador, mesmo membro', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), {
        name: 'Casa',
        ownerId: 'alice',
        memberIds: ['alice'],
        createdAt: Timestamp.now(),
      })
    })

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(deleteDoc(doc(aliceDb, 'workspaces/wsA')))
  })
})

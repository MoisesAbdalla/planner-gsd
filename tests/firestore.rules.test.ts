import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
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

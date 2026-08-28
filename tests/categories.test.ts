// Categorias como dado (CAT-01..04, AUTH-06/07) — plano 01-04. Mesmo padrão
// de mock de tests/bootstrap.test.ts e tests/invite.test.ts: `db` de
// src/shared/firebase/client.ts é substituído por um getter que devolve
// `activeDb`, trocada por contexto autenticado do emulador — a assinatura
// pública das funções de produção não muda.
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import {
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { withTestEnv } from './rules-harness'

let activeDb: Firestore

vi.mock('../src/shared/firebase/client', () => ({
  get db() {
    return activeDb
  },
}))

const { CATEGORY_COLOR_ORDER, CATEGORY_COLOR_TOKENS } = await import('../src/shared/theme/tokens')
const { DEFAULT_CATEGORIES } = await import('../src/modules/categories/data/defaults')
const { categoriesCollection } = await import('../src/modules/categories/data/refs')
const { seedDefaultCategories } = await import('../src/modules/categories/data/seed')

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

// -----------------------------------------------------------------------
// Experimento do Open Question 2 (01-RESEARCH.md §Lacunas / §Pitfall:
// seeding no mesmo batch da criação do workspace). Descartável no sentido
// de que não bloqueia a implementação (a separação em dois passos é
// mantida de qualquer forma), mas mantido como teste permanente porque
// prova, contra o emulador real, o comportamento documentado como
// [ASSUMED] em 01-RESEARCH.md — resolve a pergunta em aberto em vez de
// deixá-la sem resposta.
// -----------------------------------------------------------------------
describe('experimento — get() dentro do mesmo writeBatch que cria o pai (Open Question 2)', () => {
  test('criar o workspace E uma categoria filha (cuja regra faz get() no pai via isMember) no MESMO writeBatch é NEGADO', async () => {
    activeDb = testEnv.authenticatedContext('carol').firestore()

    const batch = writeBatch(activeDb)
    batch.set(doc(activeDb, 'workspaces/wsExp'), {
      name: 'Experimento',
      ownerId: 'carol',
      memberIds: ['carol'],
      createdAt: serverTimestamp(),
    })
    batch.set(doc(activeDb, 'workspaces/wsExp/categories/mercado'), {
      name: 'Mercado',
      color: 'mercado',
      isSystemDefault: true,
      canArchive: true,
      archivedAt: null,
      createdAt: serverTimestamp(),
    })

    // Resultado registrado em detalhe no SUMMARY desta execução: get() da
    // regra de isMember() dentro da regra de create de categories avalia
    // contra o estado ANTERIOR ao batch inteiro — o workspace "ainda não
    // existe" do ponto de vista dessa regra, mesmo estando no mesmo batch.
    // O batch inteiro é atômico: uma escrita negada reverte tudo. Isso
    // CONFIRMA (não apenas por precaução) que a separação em dois passos
    // sequenciais aguardados em bootstrap.ts é estritamente necessária.
    let result: 'succeeded' | 'failed'
    try {
      await batch.commit()
      result = 'succeeded'
    } catch {
      result = 'failed'
    }
    expect(result).toBe('failed')
  })
})

describe('DEFAULT_CATEGORIES referencia a paleta fixa de src/shared/theme/tokens.ts', () => {
  test('as 12 ids/ordem de DEFAULT_CATEGORIES são idênticas a CATEGORY_COLOR_ORDER, e cada color resolve em CATEGORY_COLOR_TOKENS', () => {
    expect(DEFAULT_CATEGORIES.map((c) => c.id)).toEqual([...CATEGORY_COLOR_ORDER])
    for (const category of DEFAULT_CATEGORIES) {
      expect(CATEGORY_COLOR_TOKENS[category.color]).toBeDefined()
    }
    // "Outros" sempre recebe o tom neutro fixo da paleta (D-10) — nunca um
    // dos 11 tons cromáticos.
    const outros = DEFAULT_CATEGORIES.find((c) => c.id === 'outros')!
    expect(outros.color).toBe('outros')
    expect(outros.canArchive).toBe(false)
  })
})

describe('seedDefaultCategories (CAT-01)', () => {
  test('seed/contagem: depois de seedDefaultCategories, a subcoleção tem exatamente 12 documentos', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    const snap = await getDocs(categoriesCollection('wsA'))
    expect(snap.size).toBe(12)
  })

  test('seed/nomes: os 12 nomes são exatamente os de D-09, com acentuação preservada', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    const snap = await getDocs(categoriesCollection('wsA'))
    const names = snap.docs.map((d) => d.data().name).sort()
    expect(names).toEqual(
      [
        'Mercado',
        'Alimentação',
        'Transporte',
        'Moradia',
        'Saúde',
        'Lazer',
        'Assinaturas',
        'Educação',
        'Vestuário',
        'Pets',
        'Presentes',
        'Outros',
      ].sort(),
    )
  })

  test('seed/ids: os IDs dos documentos são os slugs sem acento', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    const snap = await getDocs(categoriesCollection('wsA'))
    const ids = snap.docs.map((d) => d.id).sort()
    expect(ids).toEqual(
      [
        'mercado',
        'alimentacao',
        'transporte',
        'moradia',
        'saude',
        'lazer',
        'assinaturas',
        'educacao',
        'vestuario',
        'pets',
        'presentes',
        'outros',
      ].sort(),
    )
  })

  test('seed/cores: cada documento tem color apontando para um dos 12 tons; outros aponta para o tom neutro', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    const snap = await getDocs(categoriesCollection('wsA'))
    for (const d of snap.docs) {
      expect(
        CATEGORY_COLOR_TOKENS[d.data().color as keyof typeof CATEGORY_COLOR_TOKENS],
      ).toBeDefined()
    }
    const outrosSnap = snap.docs.find((d) => d.id === 'outros')!
    expect(outrosSnap.data().color).toBe('outros')
  })

  test('seed/travas: todo documento nasce isSystemDefault=true, archivedAt=null; canArchive é true menos em outros', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    const snap = await getDocs(categoriesCollection('wsA'))
    for (const d of snap.docs) {
      const data = d.data()
      expect(data.isSystemDefault).toBe(true)
      expect(data.archivedAt).toBeNull()
      expect(data.canArchive).toBe(d.id !== 'outros')
    }
  })

  test('seed/idempotência: chamar seedDefaultCategories duas vezes seguidas deixa a contagem em 12 sem duplicar', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')
    const firstSnap = await getDocs(categoriesCollection('wsA'))
    const firstCreatedAt = firstSnap.docs.find((d) => d.id === 'mercado')!.data().createdAt

    await seedDefaultCategories('wsA')
    const secondSnap = await getDocs(categoriesCollection('wsA'))
    const secondCreatedAt = secondSnap.docs.find((d) => d.id === 'mercado')!.data().createdAt

    expect(secondSnap.size).toBe(12)
    // createdAt do primeiro seeding nunca é tocado pelo segundo — a
    // segunda chamada não reescreve documentos já existentes.
    expect((secondCreatedAt as Timestamp).isEqual(firstCreatedAt as Timestamp)).toBe(true)
  })

  test('seed/retomada: apagando três documentos com as regras desabilitadas e chamando o seeding de novo, a contagem volta a 12 sem duplicar os nove que restaram', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await seedDefaultCategories('wsA')

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore()
      await deleteDoc(doc(adminDb, 'workspaces/wsA/categories/pets'))
      await deleteDoc(doc(adminDb, 'workspaces/wsA/categories/presentes'))
      await deleteDoc(doc(adminDb, 'workspaces/wsA/categories/vestuario'))
    })

    const afterDeleteSnap = await getDocs(categoriesCollection('wsA'))
    const survivingCreatedAt = afterDeleteSnap.docs.find((d) => d.id === 'mercado')!.data()
      .createdAt

    await seedDefaultCategories('wsA')

    const finalSnap = await getDocs(categoriesCollection('wsA'))
    expect(finalSnap.size).toBe(12)
    const ids = finalSnap.docs.map((d) => d.id).sort()
    expect(ids).toContain('pets')
    expect(ids).toContain('presentes')
    expect(ids).toContain('vestuario')

    // Os nove que sobreviveram não foram recriados/sobrescritos.
    const finalMercadoCreatedAt = finalSnap.docs.find((d) => d.id === 'mercado')!.data().createdAt
    expect((finalMercadoCreatedAt as Timestamp).isEqual(survivingCreatedAt as Timestamp)).toBe(
      true,
    )
  })

  test('seed/concorrência: dois seedings concorrentes no mesmo espaço convergem para as mesmas 12 categorias', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    await Promise.all([seedDefaultCategories('wsA'), seedDefaultCategories('wsA')])

    const snap = await getDocs(categoriesCollection('wsA'))
    expect(snap.size).toBe(12)
  })
})

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
const { createCategory, updateCategory, archiveCategory } = await import(
  '../src/modules/categories/hooks/useCategoryMutations'
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

describe('createCategory / updateCategory / archiveCategory (CAT-02, CAT-03, CAT-04)', () => {
  test('createCategory cria isSystemDefault=false, canArchive=true, archivedAt=null e devolve o id gerado', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)

    const snap = await getDocs(categoriesCollection('wsA'))
    const created = snap.docs.find((d) => d.id === id)!.data()
    expect(created.name).toBe('Farmácia')
    expect(created.color).toBe('saude')
    expect(created.isSystemDefault).toBe(false)
    expect(created.canArchive).toBe(true)
    expect(created.archivedAt).toBeNull()
  })

  test('updateCategory altera só o nome e mantém color/isSystemDefault/canArchive/createdAt intactos', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    const beforeSnap = await getDocs(categoriesCollection('wsA'))
    const before = beforeSnap.docs.find((d) => d.id === id)!.data()

    await updateCategory('wsA', id, { name: 'Farmácia e drogaria' })

    const afterSnap = await getDocs(categoriesCollection('wsA'))
    const after = afterSnap.docs.find((d) => d.id === id)!.data()
    expect(after.name).toBe('Farmácia e drogaria')
    expect(after.color).toBe(before.color)
    expect(after.isSystemDefault).toBe(before.isSystemDefault)
    expect(after.canArchive).toBe(before.canArchive)
    expect((after.createdAt as Timestamp).isEqual(before.createdAt as Timestamp)).toBe(true)
  })

  test('updateCategory altera só a cor', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    await updateCategory('wsA', id, { color: 'lazer' })

    const snap = await getDocs(categoriesCollection('wsA'))
    const after = snap.docs.find((d) => d.id === id)!.data()
    expect(after.color).toBe('lazer')
    expect(after.name).toBe('Farmácia')
  })

  test('archiveCategory define archivedAt e o documento continua existindo na subcoleção (CAT-04)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    await archiveCategory('wsA', id)

    const snap = await getDocs(categoriesCollection('wsA'))
    const after = snap.docs.find((d) => d.id === id)
    expect(after).toBeDefined()
    expect(after!.data().archivedAt).not.toBeNull()
  })

  test('archiveCategory chamado duas vezes seguidas não lança e deixa o documento arquivado (CAT-04 idempotency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    await archiveCategory('wsA', id)
    await expect(archiveCategory('wsA', id)).resolves.toBeUndefined()

    const snap = await getDocs(categoriesCollection('wsA'))
    const after = snap.docs.find((d) => d.id === id)!.data()
    expect(after.archivedAt).not.toBeNull()
  })

  test('archiveCategory rejeita para outros — a regra nega (defesa em profundidade)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    await seedDefaultCategories('wsA')

    await expect(archiveCategory('wsA', 'outros')).rejects.toBeDefined()
  })

  test('duas chamadas de createCategory sem aguardar uma pela outra produzem dois documentos distintos (AUTH-06 concurrency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const [idA, idB] = await Promise.all([
      createCategory('wsA', { name: 'Farmácia', color: 'saude' }),
      createCategory('wsA', { name: 'Streaming', color: 'assinaturas' }),
    ])

    expect(idA).not.toBe(idB)
    const snap = await getDocs(categoriesCollection('wsA'))
    expect(snap.docs.some((d) => d.id === idA)).toBe(true)
    expect(snap.docs.some((d) => d.id === idB)).toBe(true)
  })

  test('salvar a mesma edição duas vezes deixa o documento no mesmo estado (CAT-03 idempotency)', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()

    const id = await createCategory('wsA', { name: 'Farmácia', color: 'saude' })
    await updateCategory('wsA', id, { name: 'Farmácia e drogaria' })
    await updateCategory('wsA', id, { name: 'Farmácia e drogaria' })

    const snap = await getDocs(categoriesCollection('wsA'))
    const after = snap.docs.find((d) => d.id === id)!.data()
    expect(after.name).toBe('Farmácia e drogaria')
  })
})

describe('consulta usada por useCategories — ordenação e isolamento (AUTH-06)', () => {
  test('a query ordenada por nome devolve as categorias ordenadas por nome, e o resultado é idêntico entre duas execuções', async () => {
    await seedWorkspace('wsA', 'alice')
    activeDb = testEnv.authenticatedContext('alice').firestore()
    await seedDefaultCategories('wsA')

    const q = query(categoriesCollection('wsA'), orderBy('name'))
    const firstSnap = await getDocs(q)
    const secondSnap = await getDocs(q)

    const firstNames = firstSnap.docs.map((d) => d.data().name)
    const secondNames = secondSnap.docs.map((d) => d.data().name)
    const sorted = [...firstNames].sort((a, b) => a.localeCompare(b, 'pt-BR'))

    expect(firstNames).toEqual(sorted)
    expect(secondNames).toEqual(firstNames)
  })

  test('duas categorias com o mesmo nome em wsA e em wsB não interferem uma na outra (AUTH-06 adjacency)', async () => {
    await seedWorkspace('wsA', 'alice')
    await seedWorkspace('wsB', 'bob')

    activeDb = testEnv.authenticatedContext('alice').firestore()
    const idA = await createCategory('wsA', { name: 'Assinaturas extra', color: 'assinaturas' })

    activeDb = testEnv.authenticatedContext('bob').firestore()
    const idB = await createCategory('wsB', { name: 'Assinaturas extra', color: 'assinaturas' })

    // Cada leitura usa o membro correto do espaço lido: `activeDb` (o
    // mesmo singleton que categoriesCollection() usa por baixo) precisa
    // apontar para alice para ler wsA e para bob para ler wsB — ler wsA
    // como bob seria negado por isMember(), que já é provado à parte em
    // tests/firestore.rules.test.ts.
    activeDb = testEnv.authenticatedContext('alice').firestore()
    const snapA = await getDocs(categoriesCollection('wsA'))

    activeDb = testEnv.authenticatedContext('bob').firestore()
    const snapB = await getDocs(categoriesCollection('wsB'))

    expect(snapA.docs.some((d) => d.id === idA)).toBe(true)
    expect(snapA.docs.some((d) => d.id === idB)).toBe(false)
    expect(snapB.docs.some((d) => d.id === idB)).toBe(true)
    expect(snapB.docs.some((d) => d.id === idA)).toBe(false)
  })
})

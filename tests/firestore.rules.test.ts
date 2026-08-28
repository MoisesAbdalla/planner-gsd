import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { withTestEnv } from './rules-harness'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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

// ---------------------------------------------------------------------
// 01-02: convite sem backend (AUTH-04, AUTH-05, AUTH-07) — ver
// 01-RESEARCH.md §O desenho central e o bloco <threat_model> do plano.
// ---------------------------------------------------------------------

async function seedTwoWorkspaces() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore()
    await setDoc(doc(adminDb, 'workspaces/wsA'), {
      name: 'Casa A',
      ownerId: 'alice',
      memberIds: ['alice'],
      createdAt: Timestamp.now(),
    })
    await setDoc(doc(adminDb, 'workspaces/wsB'), {
      name: 'Casa B',
      ownerId: 'bob',
      memberIds: ['bob'],
      createdAt: Timestamp.now(),
    })
    await setDoc(doc(adminDb, 'workspaces/wsA/categories/mercado'), {
      name: 'Mercado',
      color: '#000',
      canArchive: true,
      archivedAt: null,
    })
  })
}

describe('isolamento entre dois espaços reais (AUTH-07, T-01-04)', () => {
  test('bob (membro só de wsB) é negado ao ler workspaces/wsA e workspaces/wsA/categories/mercado; alice tem sucesso nas duas', async () => {
    await seedTwoWorkspaces()

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(aliceDb, 'workspaces/wsA')))
    await assertSucceeds(getDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado')))

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(getDoc(doc(bobDb, 'workspaces/wsA')))
    await assertFails(getDoc(doc(bobDb, 'workspaces/wsA/categories/mercado')))
  })

  test('bob é negado ao criar workspaces/wsA/categories/nova', async () => {
    await seedTwoWorkspaces()

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      setDoc(doc(bobDb, 'workspaces/wsA/categories/nova'), {
        name: 'Nova',
        color: '#111',
        canArchive: true,
        archivedAt: null,
      }),
    )
  })
})

async function seedInvite(
  token: string,
  overrides: Partial<{
    workspaceId: string
    createdBy: string
    status: 'pending' | 'used'
    usedBy: string | null
    usedAt: Timestamp | null
    expiresAt: Timestamp
    createdAt: Timestamp
  }> = {},
) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `invites/${token}`), {
      workspaceId: 'wsA',
      createdBy: 'alice',
      status: 'pending',
      usedBy: null,
      usedAt: null,
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      ...overrides,
    })
  })
}

async function seedWorkspaceA() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), {
      name: 'Casa A',
      ownerId: 'alice',
      memberIds: ['alice'],
      createdAt: Timestamp.now(),
    })
  })
}

describe('convite/enumeração (AUTH-07, T-01-04)', () => {
  test('list na coleção invites é negado para qualquer autenticado; get por ID exato é permitido', async () => {
    await seedInvite('TOKEN123')

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(getDocs(collection(aliceDb, 'invites')))
    await assertSucceeds(getDoc(doc(aliceDb, 'invites/TOKEN123')))
  })
})

describe('convite/criação (AUTH-04, T-01-01)', () => {
  test('alice, membro de wsA, cria um convite pendente válido', async () => {
    await seedWorkspaceA()

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      setDoc(doc(aliceDb, 'invites/TOKEN123'), {
        workspaceId: 'wsA',
        createdBy: 'alice',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      }),
    )
  })

  test('carol, que não é membro de wsA, é negada ao criar o mesmo convite', async () => {
    await seedWorkspaceA()

    const carolDb = testEnv.authenticatedContext('carol').firestore()
    await assertFails(
      setDoc(doc(carolDb, 'invites/TOKEN999'), {
        workspaceId: 'wsA',
        createdBy: 'carol',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      }),
    )
  })

  test('alice é negada ao criar convite com createdBy diferente do próprio uid', async () => {
    await seedWorkspaceA()

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      setDoc(doc(aliceDb, 'invites/TOKEN888'), {
        workspaceId: 'wsA',
        createdBy: 'someone-else',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      }),
    )
  })

  test('alice é negada ao criar convite já com status used', async () => {
    await seedWorkspaceA()

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      setDoc(doc(aliceDb, 'invites/TOKEN777'), {
        workspaceId: 'wsA',
        createdBy: 'alice',
        status: 'used',
        usedBy: null,
        usedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      }),
    )
  })
})

describe('convite/resgate (AUTH-05, T-01-03)', () => {
  test('bob (sem /users/bob) resgata o convite: atualiza o convite para used e entra em memberIds enviando joinToken', async () => {
    await seedWorkspaceA()
    await seedInvite('TOKEN123')

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    // Ordem deliberada: a regra do workspace resolve o convite via get() —
    // esse get() PRECISA ver o convite ainda 'pending'. Em produção
    // (Task 2), as duas escritas acontecem dentro da mesma runTransaction e
    // ambas avaliam contra o mesmo estado anterior, então a ordem real não
    // importa; aqui, como as duas chamadas são independentes (sem
    // transação — Task 1 só prova a regra em si), a escrita do workspace
    // TEM que vir antes da escrita do convite, ou o get() dentro dela veria
    // 'used' e seria negada. Empiricamente confirmado contra o emulador
    // (01-RESEARCH.md §Testando isolamento não roda ao vivo o exemplo na
    // ordem inversa — ver SUMMARY desta execução).
    await assertSucceeds(
      updateDoc(doc(bobDb, 'workspaces/wsA'), {
        memberIds: arrayUnion('bob'),
        joinToken: 'TOKEN123',
      }),
    )
    await assertSucceeds(
      updateDoc(doc(bobDb, 'invites/TOKEN123'), {
        status: 'used',
        usedBy: 'bob',
        usedAt: serverTimestamp(),
      }),
    )
  })

  test('carol é negada ao tentar resgatar um convite já used', async () => {
    await seedInvite('TOKEN123', { status: 'used', usedBy: 'bob' })

    const carolDb = testEnv.authenticatedContext('carol').firestore()
    await assertFails(
      updateDoc(doc(carolDb, 'invites/TOKEN123'), {
        status: 'used',
        usedBy: 'carol',
        usedAt: serverTimestamp(),
      }),
    )
  })

  test('bob é negado ao resgatar convite expirado', async () => {
    await seedInvite('TOKEN123', { expiresAt: Timestamp.fromMillis(Date.now() - 1000) })

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      updateDoc(doc(bobDb, 'invites/TOKEN123'), {
        status: 'used',
        usedBy: 'bob',
        usedAt: serverTimestamp(),
      }),
    )
  })

  test('bob é negado ao alterar workspaceId ou createdBy do convite na mesma escrita de resgate', async () => {
    await seedInvite('TOKEN123')

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      updateDoc(doc(bobDb, 'invites/TOKEN123'), {
        status: 'used',
        usedBy: 'bob',
        usedAt: serverTimestamp(),
        workspaceId: 'wsB',
      }),
    )
    await assertFails(
      updateDoc(doc(bobDb, 'invites/TOKEN123'), {
        status: 'used',
        usedBy: 'bob',
        usedAt: serverTimestamp(),
        createdBy: 'bob',
      }),
    )
  })

  test('delete em invites/TOKEN123 é negado para qualquer chamador, inclusive quem criou', async () => {
    await seedInvite('TOKEN123')

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(deleteDoc(doc(aliceDb, 'invites/TOKEN123')))
  })

  test('bob, que já pertence a wsB, é negado ao resgatar convite de wsA', async () => {
    await seedWorkspaceA()
    await seedInvite('TOKEN123')
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/bob'), { workspaceId: 'wsB' })
    })

    const bobDb = testEnv.authenticatedContext('bob').firestore()
    await assertFails(
      updateDoc(doc(bobDb, 'workspaces/wsA'), {
        memberIds: arrayUnion('bob'),
        joinToken: 'TOKEN123',
      }),
    )
  })
})

describe('convite/a falha mais perigosa — entrada sem posse do token (AUTH-05, T-01-02)', () => {
  async function seedMalloryScenario() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore()
      await setDoc(doc(adminDb, 'workspaces/wsA'), {
        name: 'Casa A',
        ownerId: 'alice',
        memberIds: ['alice'],
        createdAt: Timestamp.now(),
      })
      await setDoc(doc(adminDb, 'workspaces/wsB'), {
        name: 'Casa B',
        ownerId: 'zoe',
        memberIds: ['zoe'],
        createdAt: Timestamp.now(),
      })
      await setDoc(doc(adminDb, 'invites/TOKEN123'), {
        workspaceId: 'wsA',
        createdBy: 'alice',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      })
      await setDoc(doc(adminDb, 'invites/TOKENB'), {
        workspaceId: 'wsB',
        createdBy: 'zoe',
        status: 'pending',
        usedBy: null,
        usedAt: null,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + SEVEN_DAYS_MS),
      })
    })
  }

  test('mallory tenta entrar em wsA sem enviar joinToken — DENIED', async () => {
    await seedMalloryScenario()
    const malloryDb = testEnv.authenticatedContext('mallory').firestore()
    await assertFails(
      updateDoc(doc(malloryDb, 'workspaces/wsA'), {
        memberIds: arrayUnion('mallory'),
      }),
    )
  })

  test('mallory tenta entrar em wsA com joinToken chutado — DENIED', async () => {
    await seedMalloryScenario()
    const malloryDb = testEnv.authenticatedContext('mallory').firestore()
    await assertFails(
      updateDoc(doc(malloryDb, 'workspaces/wsA'), {
        memberIds: arrayUnion('mallory'),
        joinToken: 'CHUTE-ERRADO',
      }),
    )
  })

  test('mallory tenta entrar em wsA com joinToken válido de OUTRO workspace (wsB) — DENIED', async () => {
    await seedMalloryScenario()
    const malloryDb = testEnv.authenticatedContext('mallory').firestore()
    await assertFails(
      updateDoc(doc(malloryDb, 'workspaces/wsA'), {
        memberIds: arrayUnion('mallory'),
        joinToken: 'TOKENB',
      }),
    )
  })
})

describe('workspace/membro não mexe na lista (AUTH-07)', () => {
  test('alice, já membro de wsA, é negada ao remover bob de memberIds pelo caminho de atualização normal', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), {
        name: 'Casa A',
        ownerId: 'alice',
        memberIds: ['alice', 'bob'],
        createdAt: Timestamp.now(),
      })
    })

    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(aliceDb, 'workspaces/wsA'), { memberIds: ['alice'] }))
  })
})

describe('WR-01: ramo de membro já existente valida o campo name (AUTH-07)', () => {
  async function seedRenameableWorkspace() {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'workspaces/wsA'), {
        name: 'Casa A',
        ownerId: 'alice',
        memberIds: ['alice'],
        createdAt: Timestamp.now(),
      })
    })
  }

  test('alice, membro, renomeia o espaço com um nome válido — sucesso', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: 'Nosso Cantinho' }))
  })

  test('alice é negada ao renomear o espaço para string vazia', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: '' }))
  })

  test('alice é negada ao gravar name como tipo não-string', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: 123 }))
  })

  test('alice é negada ao gravar name maior que 80 caracteres', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: 'x'.repeat(81) }))
  })

  test('alice, membro já existente, é negada ao forjar ownerId na mesma escrita que mantém memberIds', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: 'Casa A', ownerId: 'mallory' }),
    )
  })

  test('alice, membro já existente, é negada ao forjar createdAt na mesma escrita', async () => {
    await seedRenameableWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      updateDoc(doc(aliceDb, 'workspaces/wsA'), { name: 'Casa A', createdAt: Timestamp.now() }),
    )
  })
})

// ---------------------------------------------------------------------
// 01-04: categorias como dado (CAT-01..04, AUTH-06/07) — ver
// 01-RESEARCH.md §Seeding das 12 categorias, §Arquivar vs. excluir e o
// bloco <threat_model> do plano 01-04 (T-01-04, T-01-18, T-01-19).
// ---------------------------------------------------------------------

async function seedCategoryWorkspace() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore()
    await setDoc(doc(adminDb, 'workspaces/wsA'), {
      name: 'Casa A',
      ownerId: 'alice',
      memberIds: ['alice'],
      createdAt: Timestamp.now(),
    })
    await setDoc(doc(adminDb, 'workspaces/wsA/categories/mercado'), {
      name: 'Mercado',
      color: 'mercado',
      isSystemDefault: true,
      canArchive: true,
      archivedAt: null,
      createdAt: Timestamp.now(),
    })
    await setDoc(doc(adminDb, 'workspaces/wsA/categories/outros'), {
      name: 'Outros',
      color: 'outros',
      isSystemDefault: true,
      canArchive: false,
      archivedAt: null,
      createdAt: Timestamp.now(),
    })
  })
}

describe('categorias — criação (CAT-02, T-01-04)', () => {
  test('alice cria uma categoria com name/color válidos — sucesso', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      setDoc(doc(aliceDb, 'workspaces/wsA/categories/farmacia'), {
        name: 'Farmácia',
        color: 'saude',
        isSystemDefault: false,
        canArchive: true,
        archivedAt: null,
        createdAt: serverTimestamp(),
      }),
    )
  })

  test('alice é negada ao criar categoria com name vazio', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      setDoc(doc(aliceDb, 'workspaces/wsA/categories/vazia'), {
        name: '',
        color: 'saude',
        isSystemDefault: false,
        canArchive: true,
        archivedAt: null,
        createdAt: serverTimestamp(),
      }),
    )
  })
})

describe('categorias — archive e delete (CAT-04, T-01-18, T-01-19)', () => {
  test('alice arquiva mercado definindo archivedAt — sucesso, o documento continua existindo depois', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado'), {
        archivedAt: serverTimestamp(),
      }),
    )

    const snap = await getDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado'))
    expect(snap.exists()).toBe(true)
  })

  test('archive: alice é negada ao definir archivedAt em outros, mesmo forjando a requisição', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertFails(
      updateDoc(doc(aliceDb, 'workspaces/wsA/categories/outros'), {
        archivedAt: serverTimestamp(),
      }),
    )
  })

  test('archive: arquivar mercado duas vezes seguidas continua sendo permitido (CAT-04 idempotency)', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado'), {
        archivedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado'), {
        archivedAt: serverTimestamp(),
      }),
    )
  })

  test('archive/delete: alice é negada ao excluir qualquer documento de categoria, inclusive uma que ela mesma criou', async () => {
    await seedCategoryWorkspace()
    const aliceDb = testEnv.authenticatedContext('alice').firestore()

    await assertFails(deleteDoc(doc(aliceDb, 'workspaces/wsA/categories/mercado')))

    await assertSucceeds(
      setDoc(doc(aliceDb, 'workspaces/wsA/categories/propria'), {
        name: 'Própria',
        color: 'lazer',
        isSystemDefault: false,
        canArchive: true,
        archivedAt: null,
        createdAt: serverTimestamp(),
      }),
    )
    await assertFails(deleteDoc(doc(aliceDb, 'workspaces/wsA/categories/propria')))
  })
})

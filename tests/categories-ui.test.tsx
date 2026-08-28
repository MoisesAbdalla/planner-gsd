// Testes de UI de categorias (plano 01-06). Roda no projeto "jsdom" —
// Firebase é mockado para isolar comportamento de interface, mesmo padrão
// de tests/shell.test.tsx e tests/invite-ui.test.tsx.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

const useWorkspaceMock = vi.fn()
vi.mock('@/shared/workspace/WorkspaceProvider', () => ({
  useWorkspace: () => useWorkspaceMock(),
}))

const useCategoriesMock = vi.fn()
vi.mock('@/modules/categories/hooks/useCategories', () => ({
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
}))

const createCategoryMock = vi.fn()
const updateCategoryMock = vi.fn()
const archiveCategoryMock = vi.fn()
vi.mock('@/modules/categories/hooks/useCategoryMutations', () => ({
  createCategory: (...args: unknown[]) => createCategoryMock(...args),
  updateCategory: (...args: unknown[]) => updateCategoryMock(...args),
  archiveCategory: (...args: unknown[]) => archiveCategoryMock(...args),
}))

import { CategoryList } from '../src/modules/categories/components/CategoryList'
import { CategoryFormDialog } from '../src/modules/categories/components/CategoryFormDialog'
import { ArchiveCategoryDialog } from '../src/modules/categories/components/ArchiveCategoryDialog'
import { CategoryColorGrid } from '../src/modules/categories/components/CategoryColorGrid'
import { normalizeCategoryName, isDuplicateName } from '../src/modules/categories/lib/categoryName'
import { CATEGORY_COLOR_ORDER } from '../src/shared/theme/tokens'
import type { Category } from '../src/modules/categories/data/refs'

const WORKSPACE = { id: 'ws1', name: 'Casa', ownerId: 'u1', memberIds: ['u1', 'u2'], createdAt: null }

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'mercado',
    name: 'Mercado',
    color: 'mercado',
    isSystemDefault: true,
    canArchive: true,
    archivedAt: null,
    createdAt: null as unknown as Category['createdAt'],
    ...overrides,
  }
}

const OUTROS = makeCategory({ id: 'outros', name: 'Outros', color: 'outros', canArchive: false })

beforeEach(() => {
  vi.clearAllMocks()
  useWorkspaceMock.mockReturnValue({ status: 'ready', workspace: WORKSPACE })
  useCategoriesMock.mockReturnValue({ active: [], archived: [], loading: false, error: undefined })
  createCategoryMock.mockReset().mockResolvedValue('novo-id')
  updateCategoryMock.mockReset().mockResolvedValue(undefined)
  archiveCategoryMock.mockReset().mockResolvedValue(undefined)
})

describe('CategoryList (Screen 5, E4)', () => {
  it('carregando: mostra o indicador central e nenhuma linha (E4/loading)', () => {
    useCategoriesMock.mockReturnValue({ active: [], archived: [], loading: true, error: undefined })
    render(<CategoryList />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('erro: dispara o toast global com ação de tentar de novo (E4/error)', async () => {
    useCategoriesMock.mockReturnValue({
      active: [],
      archived: [],
      loading: false,
      error: new Error('falhou'),
    })
    render(<CategoryList />)

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Algo não funcionou. Tenta de novo?',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Tentar de novo' }) }),
    )
  })

  it('vazio: título, corpo e botão de nova categoria do Copywriting Contract (E4/empty, AUTH-06/empty)', () => {
    render(<CategoryList />)

    expect(screen.getByText('Nenhuma categoria por aqui')).toBeInTheDocument()
    expect(screen.getByText('Crie uma categoria para organizar seus gastos.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nova categoria/ })).toBeInTheDocument()
  })

  it('preenchido: cada linha traz ponto de cor, nome, editar e arquivar (E4/populated)', () => {
    const categories = [
      makeCategory({ id: 'mercado', name: 'Mercado', color: 'mercado' }),
      makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer' }),
      OUTROS,
    ]
    useCategoriesMock.mockReturnValue({
      active: categories,
      archived: [],
      loading: false,
      error: undefined,
    })
    render(<CategoryList />)

    for (const category of categories) {
      expect(screen.getByText(category.name)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: `Editar ${category.name}` })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Arquivar Mercado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arquivar Lazer' })).toBeInTheDocument()
    // Outros nunca oferece a ação de arquivar.
    expect(screen.queryByRole('button', { name: 'Arquivar Outros' })).not.toBeInTheDocument()
  })

  it('parcial: arquivadas atrás do controle fechado por padrão, esmaecidas e ao final (E4/partial, CAT-04 ordering)', async () => {
    const user = userEvent.setup()
    const active = [
      makeCategory({ id: 'mercado', name: 'Mercado', color: 'mercado' }),
      makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer' }),
    ]
    const archived = [
      makeCategory({
        id: 'assinaturas',
        name: 'Assinaturas',
        color: 'assinaturas',
        archivedAt: {} as never,
      }),
      makeCategory({ id: 'pets', name: 'Pets', color: 'pets', archivedAt: {} as never }),
    ]
    useCategoriesMock.mockReturnValue({ active, archived, loading: false, error: undefined })
    render(<CategoryList />)

    expect(screen.queryByText('Assinaturas')).not.toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: /Mostrar arquivadas/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const assinaturas = screen.getByText('Assinaturas')
    const pets = screen.getByText('Pets')
    expect(assinaturas.className).toMatch(/opacity/)
    expect(pets.className).toMatch(/opacity/)
    // Nunca oferece arquivar de novo para quem já está arquivada.
    expect(screen.queryByRole('button', { name: 'Arquivar Assinaturas' })).not.toBeInTheDocument()
  })

  it('a categoria Outros não oferece nenhuma ação de arquivar em lugar nenhum da tela', () => {
    useCategoriesMock.mockReturnValue({ active: [OUTROS], archived: [], loading: false, error: undefined })
    render(<CategoryList />)
    expect(screen.queryByRole('button', { name: 'Arquivar Outros' })).not.toBeInTheDocument()
  })

  it('nenhuma cópia quebra no plural com uma única categoria (E4/zero-one-many)', () => {
    useCategoriesMock.mockReturnValue({
      active: [makeCategory({ id: 'mercado', name: 'Mercado' })],
      archived: [],
      loading: false,
      error: undefined,
    })
    const { container } = render(<CategoryList />)
    expect(container.textContent).not.toContain('1 categorias')
    expect(screen.getByText('Mercado')).toBeInTheDocument()
  })

  it('o botão de nova categoria fica fixo no topo, nunca como botão flutuante', () => {
    render(<CategoryList />)
    const button = screen.getByRole('button', { name: /Nova categoria/ })
    expect(button.className).not.toMatch(/fixed/)
    expect(button.className).not.toMatch(/rounded-full/)
  })

  it('clicar em Nova categoria abre o formulário de criação', async () => {
    const user = userEvent.setup()
    render(<CategoryList />)

    await user.click(screen.getByRole('button', { name: /Nova categoria/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Nova categoria')).toBeInTheDocument()
  })
})

describe('Nenhuma ação de excluir categoria em lugar nenhum da interface', () => {
  it('a tela populada, com arquivadas visíveis, nunca renderiza uma ação de excluir', async () => {
    const user = userEvent.setup()
    useCategoriesMock.mockReturnValue({
      active: [makeCategory({ id: 'mercado', name: 'Mercado' })],
      archived: [makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer', archivedAt: {} as never })],
      loading: false,
      error: undefined,
    })
    render(<CategoryList />)

    await user.click(screen.getByRole('button', { name: /Mostrar arquivadas/ }))

    expect(screen.queryByText(/excluir/i)).not.toBeInTheDocument()
  })
})

describe('CategoryColorGrid (Screen 6, D-10)', () => {
  it('renderiza exatamente 12 swatches na ordem de CATEGORY_COLOR_ORDER', () => {
    expect(CATEGORY_COLOR_ORDER.length).toBe(12)
    render(<CategoryColorGrid value={CATEGORY_COLOR_ORDER[0]} onChange={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(12)
  })

  it('a seleção é marcada por aria-pressed e um ícone de confirmação, nunca só borda', () => {
    render(<CategoryColorGrid value={CATEGORY_COLOR_ORDER[2]} onChange={() => {}} />)
    const buttons = screen.getAllByRole('button')

    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[2].querySelector('svg')).not.toBeNull()
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[0].querySelector('svg')).toBeNull()
  })

  it('cada swatch é focável pelo teclado, na ordem da grade', async () => {
    const user = userEvent.setup()
    render(<CategoryColorGrid value={CATEGORY_COLOR_ORDER[0]} onChange={() => {}} />)

    await user.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('button')[0])
    await user.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('button')[1])
  })

  it('onChange é chamado com o id da cor clicada', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CategoryColorGrid value={CATEGORY_COLOR_ORDER[0]} onChange={onChange} />)

    await user.click(screen.getAllByRole('button')[3])
    expect(onChange).toHaveBeenCalledWith(CATEGORY_COLOR_ORDER[3])
  })
})

describe('categoryName (CAT-02/CAT-03 encoding)', () => {
  it('normaliza espaços das pontas, colapsa espaços internos, NFC e caixa', () => {
    expect(normalizeCategoryName('  Mercado   Livre  ')).toBe('mercado livre')
    expect(normalizeCategoryName('MERCADO')).toBe('mercado')
    expect(normalizeCategoryName('café'.normalize('NFD'))).toBe('café'.normalize('NFC').toLowerCase())
  })

  it('isDuplicateName compara normalizado e ignora o id informado', () => {
    const categories = [
      { id: 'a', name: 'Mercado' },
      { id: 'b', name: 'Lazer' },
    ]
    expect(isDuplicateName('  MERCADO  ', categories)).toBe(true)
    expect(isDuplicateName('Mercado', categories, 'a')).toBe(false)
    expect(isDuplicateName('Novo Nome', categories)).toBe(false)
  })
})

describe('CategoryFormDialog (Screen 6, E5, CAT-02, CAT-03)', () => {
  const EXISTING = [
    makeCategory({ id: 'mercado', name: 'Mercado', color: 'mercado' }),
    makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer' }),
  ]

  it('modo de criação: pré-seleciona a primeira cor ainda não usada (E5/partial)', () => {
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={null}
      />,
    )

    // EXISTING usa 'mercado' (índice 0) e 'lazer' (índice 5) — a primeira
    // cor livre em CATEGORY_COLOR_ORDER é 'alimentacao' (índice 1).
    const swatchButtons = screen.getAllByRole('button', { name: /^Cor \d+ de 12/ })
    expect(swatchButtons[1]).toHaveAttribute('aria-pressed', 'true')
  })

  it('com as doze cores já em uso, ainda abre com uma cor pré-selecionada e permite salvar', async () => {
    const allUsed = CATEGORY_COLOR_ORDER.map((color, index) =>
      makeCategory({ id: `c${index}`, name: `Categoria ${index}`, color }),
    )
    const user = userEvent.setup()
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={allUsed}
        editingCategory={null}
      />,
    )

    expect(screen.getAllByRole('button', { name: /selecionada/ })).toHaveLength(1)

    await user.type(screen.getByLabelText('Nome'), 'Nova Categoria X')
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }))
    await waitFor(() => expect(createCategoryMock).toHaveBeenCalledTimes(1))
  })

  it('nome vazio ou só espaços é recusado com a cópia exata (E5/empty, CAT-02/empty, CAT-03/empty)', async () => {
    const user = userEvent.setup()
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={null}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), '   ')
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }))

    expect(await screen.findByText('Dá um nome para a categoria.')).toBeInTheDocument()
    expect(createCategoryMock).not.toHaveBeenCalled()
  })

  it('nome duplicado normalizado (NFC, sem caixa) é recusado com a cópia exata (CAT-02/encoding, CAT-01/adjacency)', async () => {
    const user = userEvent.setup()
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={null}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), '  MERCADO  ')
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }))

    expect(await screen.findByText('Já existe uma categoria com esse nome.')).toBeInTheDocument()
    expect(createCategoryMock).not.toHaveBeenCalled()
  })

  it('edição: a checagem de duplicidade ignora a própria categoria (CAT-03/encoding, CAT-03/idempotency)', async () => {
    const user = userEvent.setup()
    const editing = EXISTING[0]
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={editing}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(updateCategoryMock).toHaveBeenCalledTimes(1))
    expect(updateCategoryMock).toHaveBeenCalledWith('ws1', editing.id, {
      name: 'Mercado',
      color: 'mercado',
    })
  })

  it('durante a gravação o botão vira spinner e desabilita; segundo clique não dispara segunda gravação (E5/loading, CAT-02/idempotency)', async () => {
    let resolveCreate!: (id: string) => void
    createCategoryMock.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve
      }),
    )
    const user = userEvent.setup()
    render(
      <CategoryFormDialog
        open
        onOpenChange={() => {}}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={null}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), 'Categoria Nova')
    const button = screen.getByRole('button', { name: 'Criar categoria' })
    await user.click(button)

    await waitFor(() => expect(button).toBeDisabled())
    await user.click(button)
    expect(createCategoryMock).toHaveBeenCalledTimes(1)

    resolveCreate('novo-id')
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('quando a gravação rejeita, o toast de falha aparece e o formulário permanece aberto com os valores digitados (E5/error)', async () => {
    createCategoryMock.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <CategoryFormDialog
        open
        onOpenChange={onOpenChange}
        workspaceId="ws1"
        categories={EXISTING}
        editingCategory={null}
      />,
    )

    await user.type(screen.getByLabelText('Nome'), 'Categoria Nova')
    await user.click(screen.getByRole('button', { name: 'Criar categoria' }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Não deu para salvar. Tenta de novo?',
      expect.objectContaining({ action: expect.objectContaining({ label: 'Tentar de novo' }) }),
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByLabelText('Nome')).toHaveValue('Categoria Nova')
  })
})

describe('ArchiveCategoryDialog (Screen 7, D-11)', () => {
  const CATEGORY = makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer' })

  it('mostra a cópia exata de confirmação com o nome interpolado, e os dois botões com as cópias exatas', () => {
    render(<ArchiveCategoryDialog open onOpenChange={() => {}} workspaceId="ws1" category={CATEGORY} />)

    expect(screen.getByText("Arquivar 'Lazer'?")).toBeInTheDocument()
    expect(
      screen.getByText('Ela some das opções ao lançar, mas o histórico continua exatamente como está.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arquivar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('o botão de confirmar usa estilo neutro, nunca o token de destrutivo', () => {
    render(<ArchiveCategoryDialog open onOpenChange={() => {}} workspaceId="ws1" category={CATEGORY} />)

    const confirmButton = screen.getByRole('button', { name: 'Arquivar' })
    expect(confirmButton).toHaveAttribute('data-variant', 'secondary')
    // A base do Button aplica classes aria-invalid:*-destructive em
    // QUALQUER variante (estado de formulário inválido) — o que este teste
    // precisa provar é que o FUNDO do botão não é o da variante destructive.
    expect(confirmButton.className).not.toMatch(/bg-destructive/)
  })

  it('confirmar chama archiveCategory com o espaço e o id corretos, e só fecha quando a promessa resolve', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ArchiveCategoryDialog open onOpenChange={onOpenChange} workspaceId="ws1" category={CATEGORY} />,
    )

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(archiveCategoryMock).toHaveBeenCalledWith('ws1', 'lazer'))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })

  it('enquanto a promessa não resolve, o botão de confirmar vira spinner e desabilita', async () => {
    let resolveArchive!: () => void
    archiveCategoryMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveArchive = resolve
      }),
    )
    const user = userEvent.setup()
    render(<ArchiveCategoryDialog open onOpenChange={() => {}} workspaceId="ws1" category={CATEGORY} />)

    const confirmButton = screen.getByRole('button', { name: 'Arquivar' })
    await user.click(confirmButton)
    await waitFor(() => expect(confirmButton).toBeDisabled())

    resolveArchive()
    await waitFor(() => expect(confirmButton).not.toBeDisabled())
  })

  it('quando a promessa rejeita, o toast de falha aparece e o diálogo não fecha (categoria continua ativa)', async () => {
    archiveCategoryMock.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ArchiveCategoryDialog open onOpenChange={onOpenChange} workspaceId="ws1" category={CATEGORY} />,
    )

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('cancelar fecha o diálogo sem chamar archiveCategory', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <ArchiveCategoryDialog open onOpenChange={onOpenChange} workspaceId="ws1" category={CATEGORY} />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(archiveCategoryMock).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('Integração — arquivar a partir da lista (CAT-04)', () => {
  it('acionar arquivar numa linha abre o diálogo com o texto de confirmação, e confirmar chama archiveCategory', async () => {
    const user = userEvent.setup()
    const lazer = makeCategory({ id: 'lazer', name: 'Lazer', color: 'lazer' })
    useCategoriesMock.mockReturnValue({ active: [lazer], archived: [], loading: false, error: undefined })
    render(<CategoryList />)

    await user.click(screen.getByRole('button', { name: 'Arquivar Lazer' }))
    expect(screen.getByText("Arquivar 'Lazer'?")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Arquivar' }))
    await waitFor(() => expect(archiveCategoryMock).toHaveBeenCalledWith('ws1', 'lazer'))
  })
})

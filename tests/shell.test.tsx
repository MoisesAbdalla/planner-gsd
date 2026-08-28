// Testes de componente do shell (planos 01-03). Roda no projeto "jsdom" do
// vitest.config.ts — sem Firebase Emulator: os módulos que tocam Firebase
// (auth/workspace/firestore) são mockados para isolar o comportamento de UI.
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Isola os testes de AvatarMenu/AppRoot de precisar de um router real
    // registrado — <Link> vira um <a href> comum, suficiente para afirmar
    // destino e texto do item. O AppRoot usa o router de produção de
    // verdade (RouterProvider/beforeLoad reais) — só o <Link> é trocado.
    Link: ({
      to,
      children,
      ...props
    }: { to: string; children?: ReactNode } & Record<string, unknown>) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  }
})

const signOutOfAppMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/shared/auth/signIn', () => ({
  signOutOfApp: () => signOutOfAppMock(),
}))

const useAuthMock = vi.fn()
vi.mock('@/shared/auth/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}))

const useWorkspaceMock = vi.fn()
vi.mock('@/shared/workspace/WorkspaceProvider', () => ({
  useWorkspace: () => useWorkspaceMock(),
}))

const updateDocMock = vi.fn().mockResolvedValue(undefined)
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    // doc()/getFirestore() etc. seguem reais (não fazem I/O); só updateDoc
    // — a única chamada de rede desta task — é controlado pelo teste.
    updateDoc: (...args: unknown[]) => updateDocMock(...args),
  }
})

import { AppRoot } from '../src/app/router'
import { AvatarMenu } from '../src/app/shell/AvatarMenu'
import { readLastModule, writeLastModule } from '../src/app/shell/lastModule'
import { WorkspaceNameField } from '../src/shared/workspace/WorkspaceNameField'
import { Toaster } from '../src/shared/ui/sonner'

const SIGNED_IN_USER = { displayName: 'Alice', email: 'alice@example.com', photoURL: null }
const READY_WORKSPACE = {
  status: 'ready' as const,
  workspace: {
    id: 'ws1',
    name: 'Nosso espaço',
    ownerId: 'u1',
    memberIds: ['u1'],
    createdAt: null,
  },
}

beforeEach(() => {
  useAuthMock.mockReturnValue({ status: 'signed-in', user: SIGNED_IN_USER })
  useWorkspaceMock.mockReturnValue(READY_WORKSPACE)
  updateDocMock.mockReset().mockResolvedValue(undefined)
  signOutOfAppMock.mockClear()
})

describe('AvatarMenu (D-14)', () => {
  it('renderiza Categorias, Convidar alguém e Sair da conta com as cópias exatas', async () => {
    const user = userEvent.setup()
    render(<AvatarMenu />)

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))

    expect(screen.getByRole('menuitem', { name: 'Categorias' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Convidar alguém' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sair da conta' })).toBeInTheDocument()
  })

  it('Sair da conta dispara o diálogo de confirmação (D-22, não sai direto)', async () => {
    const user = userEvent.setup()
    render(<AvatarMenu />)

    await user.click(screen.getByRole('button', { name: 'Abrir menu da conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Sair da conta' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Sair da conta?')).toBeInTheDocument()
    expect(
      screen.getByText('Você pode entrar de novo quando quiser — nada muda no espaço.'),
    ).toBeInTheDocument()
    // Ainda não chamou signOutOfApp — só ao confirmar no diálogo.
    expect(signOutOfAppMock).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Sair' }))
    expect(signOutOfAppMock).toHaveBeenCalledTimes(1)
  })
})

describe('lastModule (D-13)', () => {
  it('readLastModule() devolve "financeiro" quando o armazenamento local está vazio', () => {
    localStorage.clear()
    expect(readLastModule()).toBe('financeiro')
  })

  it('readLastModule() devolve "tarefas" depois de writeLastModule("tarefas")', () => {
    localStorage.clear()
    writeLastModule('tarefas')
    expect(readLastModule()).toBe('tarefas')
  })
})

describe('AppRoot (gate de autenticação, E7)', () => {
  beforeEach(() => {
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('renderiza a boot screen quando o status de autenticação é loading (E7/loading)', () => {
    useAuthMock.mockReturnValue({ status: 'loading', user: null })
    render(<AppRoot />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renderiza a tela de erro genérica com ação de repetir quando o status é error (E7/error)', () => {
    useAuthMock.mockReturnValue({ status: 'error', user: null })
    render(<AppRoot />)

    expect(screen.getByText('Algo não funcionou.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('renderiza a tela de entrar quando o status é signed-out', async () => {
    useAuthMock.mockReturnValue({ status: 'signed-out', user: null })
    render(<AppRoot />)

    expect(await screen.findByText('Entrar com o Google')).toBeInTheDocument()
  })

  it('renderiza o shell quando o status é signed-in', async () => {
    useAuthMock.mockReturnValue({ status: 'signed-in', user: SIGNED_IN_USER })
    render(<AppRoot />)

    // Rota raiz redireciona pro último módulo (D-13); sem valor salvo,
    // primeiríssima abertura cai em Financeiro.
    expect(await screen.findByRole('heading', { name: 'Financeiro' })).toBeInTheDocument()
  })
})

describe('WorkspaceNameField (D-08, E6)', () => {
  it('recusa nome vazio e exibe a cópia de nome de espaço vazio (E6/empty)', async () => {
    const user = userEvent.setup()
    render(<WorkspaceNameField />)

    await user.click(screen.getByRole('button', { name: 'Nosso espaço' }))
    await user.clear(screen.getByRole('textbox', { name: 'Nome do espaço' }))
    await user.tab()

    expect(await screen.findByText('O espaço precisa de um nome.')).toBeInTheDocument()
    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('restaura o valor anterior quando a gravação rejeita (E6/error)', async () => {
    updateDocMock.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<WorkspaceNameField />)

    await user.click(screen.getByRole('button', { name: 'Nosso espaço' }))
    const input = screen.getByRole('textbox', { name: 'Nome do espaço' })
    await user.clear(input)
    await user.type(input, 'Casa Nova')
    await user.keyboard('{Enter}')

    // Volta a exibir o valor anterior — nunca o que falhou ao gravar.
    expect(await screen.findByRole('button', { name: 'Nosso espaço' })).toBeInTheDocument()
    expect(updateDocMock).toHaveBeenCalledTimes(1)
  })

  // WR-03: commit() precisa ignorar uma segunda chamada enquanto a primeira
  // ainda está em voo (reentrância) — o gatilho descrito na revisão é o
  // Enter disparando blur síncrono na remoção do <input> focado (browser
  // real remove um elemento focado e dispara blur/focusout como parte da
  // MESMA operação síncrona; jsdom não reproduz isso — limitação conhecida
  // — e é por isso que o teste anterior desta suíte não pegava o bug).
  // Reproduzir esse encadeamento exato exigiria simular remoção de nó
  // focado disparando blur SÍNCRONO a partir de dentro do commit de render
  // do próprio React — investigação confirmou que o pipeline de eventos do
  // React 19 não processa um evento nativo despachado enquanto ainda está
  // dentro do próprio ciclo de commit (proteção interna contra reentrância
  // do próprio React, independente de jsdom). Em vez de depender dessa
  // sequência frágil, exercitamos aqui um segundo caminho realista e
  // 100% reproduzível para o MESMO bug que a guarda corrige: o usuário
  // clica duas vezes, rapidamente, no botão "Tentar de novo" do toast de
  // erro antes da primeira nova tentativa resolver — sem a guarda
  // (committingRef), cada clique dispara seu próprio updateDoc.
  it('não dispara commit() duas vezes quando "Tentar de novo" é clicado duas vezes antes da gravação resolver (WR-03, reentrância)', async () => {
    // <Toaster/> (sonner) só entra na árvore neste teste específico — para
    // clicar de verdade no botão "Tentar de novo" do toast, precisamos que
    // ele exista no DOM, o que exige montar o próprio <Toaster/> (nos
    // outros testes desta suíte, toast.error() é chamado mas nunca
    // renderizado, porque não há <Toaster/> montado). jsdom não implementa
    // matchMedia (que o sonner usa para detectar tema do sistema) — stub
    // local, restaurado ao fim do teste, sem tocar tests/setup.ts global.
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      updateDocMock.mockRejectedValueOnce(new Error('offline'))

      let resolveRetry: () => void = () => {}
      let retryCalls = 0
      updateDocMock.mockImplementationOnce(() => {
        retryCalls += 1
        return new Promise<void>((resolve) => {
          resolveRetry = resolve
        })
      })

      const user = userEvent.setup()
      render(
        <>
          <WorkspaceNameField />
          <Toaster />
        </>,
      )

      await user.click(screen.getByRole('button', { name: 'Nosso espaço' }))
      const input = screen.getByRole('textbox', { name: 'Nome do espaço' })
      await user.clear(input)
      await user.type(input, 'Casa Nova')
      await user.keyboard('{Enter}')

      // sonner renderiza o toast em mais de um nó de DOM simultaneamente
      // (cópia usada para medir altura/posicionamento da pilha) — os dois
      // têm o mesmo texto acessível "Tentar de novo"; o primeiro é o que
      // está de fato visível e clicável.
      await screen.findAllByRole('button', { name: 'Tentar de novo' })
      const [retryButton] = screen.getAllByRole('button', { name: 'Tentar de novo' })

      // Dois cliques em sequência, síncronos (sem esperar entre eles) — a
      // segunda tentativa de gravação (mockImplementationOnce acima) ainda
      // não resolveu quando o segundo clique acontece.
      fireEvent.click(retryButton)
      fireEvent.click(retryButton)

      resolveRetry()
      await waitFor(() => expect(updateDocMock).toHaveBeenCalledTimes(2))
      // 1ª chamada = tentativa original (rejeitada); 2ª = o clique em Retry
      // que a guarda de reentrância deixou passar. Um segundo updateDoc do
      // clique duplicado teria levado esse total a 3.
      expect(retryCalls).toBe(1)
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})

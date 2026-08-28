// Testes de componente do shell (planos 01-03). Roda no projeto "jsdom" do
// vitest.config.ts — sem Firebase Emulator: os módulos que tocam Firebase
// (auth/workspace/firestore) são mockados para isolar o comportamento de UI.
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})

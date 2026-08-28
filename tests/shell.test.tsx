// Testes de componente do shell (plano 01-03). Roda no projeto "jsdom" do
// vitest.config.ts — sem Firebase Emulator: os módulos que tocam Firebase
// (auth/workspace) são mockados para isolar o comportamento de UI.
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Isola os testes de AvatarMenu/AppRoot de precisar de um router real
    // registrado — <Link> vira um <a href> comum, suficiente para afirmar
    // destino e texto do item.
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

vi.mock('@/shared/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'signed-in',
    user: { displayName: 'Alice', email: 'alice@example.com', photoURL: null },
  }),
}))

import { AvatarMenu } from '../src/app/shell/AvatarMenu'
import { readLastModule, writeLastModule } from '../src/app/shell/lastModule'

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

// Testes de componente do convite (plano 01-05). Roda no projeto "jsdom" do
// vitest.config.ts — sem Firebase Emulator: os módulos que tocam
// Firebase/rede são mockados para isolar o comportamento de UI, seguindo o
// mesmo padrão de tests/shell.test.tsx.
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    // Mesmo padrão de tests/shell.test.tsx: isola os testes de precisar de
    // um router real registrado.
    Link: ({
      to,
      children,
      ...props
    }: { to: string; children?: ReactNode } & Record<string, unknown>) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
    useNavigate: () => navigateMock,
  }
})

const navigateMock = vi.fn()

const toastErrorMock = vi.fn()
const toastSuccessMock = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}))

const useAuthMock = vi.fn()
vi.mock('@/shared/auth/AuthProvider', () => ({
  useAuth: () => useAuthMock(),
}))

const signInWithGoogleMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/shared/auth/signIn', () => ({
  signInWithGoogle: () => signInWithGoogleMock(),
}))

const useWorkspaceMock = vi.fn()
const createInviteMock = vi.fn()
vi.mock('@/shared/workspace/WorkspaceProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/workspace/WorkspaceProvider')>()
  return {
    ...actual,
    // WorkspaceProvider (o componente REAL) continua exportado para o
    // describe de baixo (inibição de bootstrap) — só o hook de consumo é
    // trocado, igual ao padrão já usado para @tanstack/react-router.
    useWorkspace: () => useWorkspaceMock(),
  }
})
vi.mock('@/features/invite/data/invites', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/invite/data/invites')>()
  return {
    ...actual,
    createInvite: (...args: unknown[]) => createInviteMock(...args),
  }
})

const joinWorkspaceMock = vi.fn()
vi.mock('@/features/invite/join', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/invite/join')>()
  return {
    ...actual,
    joinWorkspace: (...args: unknown[]) => joinWorkspaceMock(...args),
  }
})

const resolveUserWorkspaceMock = vi.fn()
const bootstrapNewWorkspaceMock = vi.fn()
vi.mock('@/shared/workspace/bootstrap', () => ({
  resolveUserWorkspace: (...args: unknown[]) => resolveUserWorkspaceMock(...args),
  bootstrapNewWorkspace: (...args: unknown[]) => bootstrapNewWorkspaceMock(...args),
}))

const seedDefaultCategoriesMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/modules/categories/data/seed', () => ({
  seedDefaultCategories: (...args: unknown[]) => seedDefaultCategoriesMock(...args),
}))

const onSnapshotMock = vi.fn()
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>()
  return {
    ...actual,
    onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  }
})

import { InviteDialog } from '../src/features/invite/components/InviteDialog'
import { JoinInviteScreen } from '../src/features/invite/components/JoinInviteScreen'
import { InviteErrorScreen } from '../src/features/invite/components/InviteErrorScreen'
import { JoinInviteError, type JoinInviteErrorCode } from '../src/features/invite/join'
import { WorkspaceProvider } from '../src/shared/workspace/WorkspaceProvider'

const SIGNED_IN_USER = { uid: 'u1', displayName: 'Alice', email: 'alice@example.com' }
const SECRET_WORKSPACE = {
  id: 'ws1',
  name: 'Nome Secreto Do Espaço',
  ownerId: 'u1',
  memberIds: ['u1', 'u2'],
  createdAt: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  navigateMock.mockReset()
  useAuthMock.mockReturnValue({ status: 'signed-in', user: SIGNED_IN_USER })
  useWorkspaceMock.mockReturnValue({ status: 'ready', workspace: SECRET_WORKSPACE })
  createInviteMock.mockReset()
  signInWithGoogleMock.mockReset().mockResolvedValue(undefined)
  sessionStorage.clear()
  onSnapshotMock.mockReset().mockImplementation(() => () => {})
  resolveUserWorkspaceMock.mockReset()
  bootstrapNewWorkspaceMock.mockReset()
  seedDefaultCategoriesMock.mockClear()
})

describe('InviteDialog (Screen 3, E2, AUTH-04, D-01)', () => {
  it('mostra um indicador de carregamento no lugar do campo e desabilita os dois botões enquanto createInvite não resolve (E2/loading)', async () => {
    let resolveCreate!: (token: string) => void
    createInviteMock.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveCreate = resolve
      }),
    )

    render(<InviteDialog />)

    expect(screen.getByText('Gerando link de convite…')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Link do convite' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeDisabled()

    resolveCreate('token-abc')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' })).toBeEnabled(),
    )
  })

  it('exibe a URL de inviteUrl(token) e a nota de validade quando createInvite resolve', async () => {
    createInviteMock.mockResolvedValue('token-abc')
    render(<InviteDialog />)

    const field = await screen.findByRole('textbox', { name: 'Link do convite' })
    expect(field).toHaveValue(`${window.location.origin}/entrar?convite=token-abc`)
    expect(screen.getByText('Válido por 7 dias, uso único.')).toBeInTheDocument()
  })

  it('os botões têm exatamente as cópias de compartilhar e de copiar', async () => {
    createInviteMock.mockResolvedValue('token-abc')
    render(<InviteDialog />)

    await screen.findByRole('textbox', { name: 'Link do convite' })
    expect(screen.getByRole('button', { name: 'Compartilhar no WhatsApp' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument()
  })

  it('Copiar link escreve a URL na área de transferência e dispara o toast de link copiado', async () => {
    createInviteMock.mockResolvedValue('token-abc')
    // userEvent.setup() instala seu próprio stub de Clipboard em
    // navigator.clipboard (substitui qualquer valor atribuído antes) — o
    // spy precisa ser criado DEPOIS do setup(), sobre esse mesmo stub.
    const user = userEvent.setup()
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText')
    render(<InviteDialog />)

    await screen.findByRole('textbox', { name: 'Link do convite' })
    await user.click(screen.getByRole('button', { name: 'Copiar link' }))

    expect(writeTextSpy).toHaveBeenCalledWith(`${window.location.origin}/entrar?convite=token-abc`)
    expect(toastSuccessMock).toHaveBeenCalledWith('Link copiado!')
  })

  it('quando createInvite rejeita, o toast de falha ao salvar aparece com ação de tentar de novo, que chama createInvite outra vez', async () => {
    createInviteMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('token-retry')
    render(<InviteDialog />)

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledTimes(1))
    expect(toastErrorMock).toHaveBeenCalledWith(
      'Não deu para salvar. Tenta de novo?',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Tentar de novo' }),
      }),
    )
    expect(createInviteMock).toHaveBeenCalledTimes(1)

    const [, options] = toastErrorMock.mock.calls[0] as [
      string,
      { action: { onClick: () => void } },
    ]
    options.action.onClick()

    await waitFor(() => expect(createInviteMock).toHaveBeenCalledTimes(2))
  })

  it('nunca renderiza o nome do espaço nem contagem de membros', async () => {
    createInviteMock.mockResolvedValue('token-abc')
    const { container } = render(<InviteDialog />)

    await screen.findByRole('textbox', { name: 'Link do convite' })
    expect(screen.queryByText('Nome Secreto Do Espaço')).not.toBeInTheDocument()
    expect(container.textContent).not.toContain('Nome Secreto Do Espaço')
    expect(container.textContent).not.toContain('2 membros')
  })
})

describe('JoinInviteScreen (Screen 4, E3, AUTH-05, D-07)', () => {
  it('exibe o spinner em tela cheia enquanto joinWorkspace não resolve (E3/loading)', () => {
    joinWorkspaceMock.mockReturnValue(new Promise(() => {}))
    render(<JoinInviteScreen token="tok" uid="u2" />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('joinWorkspace resolvendo navega direto para /financeiro, sem tela de confirmação', async () => {
    joinWorkspaceMock.mockResolvedValue('ws1')
    render(<JoinInviteScreen token="tok" uid="u2" />)

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/financeiro' }))
    expect(screen.queryByText(/confirmar/i)).not.toBeInTheDocument()
  })

  it('joinWorkspace chamado exatamente uma vez mesmo com múltiplas renderizações', async () => {
    joinWorkspaceMock.mockResolvedValue('ws1')
    const { rerender } = render(<JoinInviteScreen token="tok" uid="u2" />)
    rerender(<JoinInviteScreen token="tok" uid="u2" />)

    await waitFor(() => expect(navigateMock).toHaveBeenCalled())
    expect(joinWorkspaceMock).toHaveBeenCalledTimes(1)
  })

  const FAILURE_CASES: Array<{ code: JoinInviteErrorCode; title: string }> = [
    { code: 'invite-expired', title: 'Esse link não é mais válido.' },
    { code: 'invite-already-used', title: 'Esse convite já foi usado.' },
    { code: 'already-in-workspace', title: 'Você já faz parte de um espaço.' },
    // invite-not-found funde com a tela de convite expirado — nunca
    // confirma nem nega a existência de um token (T-01-21).
    { code: 'invite-not-found', title: 'Esse link não é mais válido.' },
  ]

  for (const { code, title } of FAILURE_CASES) {
    it(`joinWorkspace rejeitando com ${code} renderiza a tela cheia correspondente`, async () => {
      joinWorkspaceMock.mockRejectedValue(new JoinInviteError(code))
      render(<JoinInviteScreen token="tok" uid="u2" />)

      expect(await screen.findByText(title)).toBeInTheDocument()
      expect(navigateMock).not.toHaveBeenCalled()
    })
  }
})

describe('InviteErrorScreen (Copywriting Contract, T-01-21)', () => {
  it('convite expirado: título e corpo exatos', () => {
    render(<InviteErrorScreen code="invite-expired" />)
    expect(screen.getByText('Esse link não é mais válido.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Convites duram 7 dias por segurança. Peça para quem te convidou gerar um link novo.',
      ),
    ).toBeInTheDocument()
  })

  it('convite já usado: título e corpo exatos', () => {
    render(<InviteErrorScreen code="invite-already-used" />)
    expect(screen.getByText('Esse convite já foi usado.')).toBeInTheDocument()
    expect(
      screen.getByText('Cada link serve para uma entrada só. Peça um link novo para continuar.'),
    ).toBeInTheDocument()
  })

  it('já pertence a outro espaço: título e corpo exatos', () => {
    render(<InviteErrorScreen code="already-in-workspace" />)
    expect(screen.getByText('Você já faz parte de um espaço.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Por enquanto cada pessoa participa de um espaço só. Se quiser entrar neste, fale com quem te convidou.',
      ),
    ).toBeInTheDocument()
  })

  it('tem um único botão de ação, que leva de volta para /entrar sem o parâmetro de convite', () => {
    render(<InviteErrorScreen code="invite-expired" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/entrar')
  })

  it('nunca exibe nome do espaço, id do espaço, token completo ou contagem de membros', () => {
    const { container } = render(<InviteErrorScreen code="invite-already-used" />)
    expect(container.textContent).not.toContain('ws1')
    expect(container.textContent).not.toContain('token-abc')
  })
})

describe('WorkspaceProvider inibe bootstrap enquanto há convite pendente (D-07)', () => {
  function Probe() {
    return <div>probe</div>
  }

  it('não chama bootstrapNewWorkspace quando há um token de convite pendente para este uid', async () => {
    sessionStorage.setItem('cotidiano:pendingInviteToken', 'tok-pendente')
    useAuthMock.mockReturnValue({ status: 'signed-in', user: SIGNED_IN_USER })
    resolveUserWorkspaceMock.mockResolvedValue(null)

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>,
    )

    await waitFor(() => expect(resolveUserWorkspaceMock).toHaveBeenCalledWith(SIGNED_IN_USER.uid))
    expect(bootstrapNewWorkspaceMock).not.toHaveBeenCalled()
    // Fica esperando reativamente /users/{uid} em vez de desistir — prova
    // de que o provider está de fato aguardando, não só pulando o passo.
    expect(onSnapshotMock).toHaveBeenCalled()
  })

  it('assim que o resgate escreve users/{uid}.workspaceId, o provider assina o workspace real sem nunca ter chamado bootstrap', async () => {
    sessionStorage.setItem('cotidiano:pendingInviteToken', 'tok-pendente')
    useAuthMock.mockReturnValue({ status: 'signed-in', user: SIGNED_IN_USER })
    resolveUserWorkspaceMock.mockResolvedValue(null)

    let userDocCallback!: (snap: {
      exists: () => boolean
      data: () => { workspaceId?: string }
    }) => void
    onSnapshotMock.mockImplementation(
      (
        ref: { path?: string },
        callback: (snap: { exists: () => boolean; data: () => Record<string, unknown> }) => void,
      ) => {
        userDocCallback = callback
        return () => {}
      },
    )

    render(
      <WorkspaceProvider>
        <Probe />
      </WorkspaceProvider>,
    )

    await waitFor(() => expect(onSnapshotMock).toHaveBeenCalledTimes(1))
    expect(bootstrapNewWorkspaceMock).not.toHaveBeenCalled()

    // Simula o resgate (JoinInviteScreen) escrevendo users/{uid}.workspaceId.
    userDocCallback({ exists: () => true, data: () => ({ workspaceId: 'ws-resgatado' }) })

    await waitFor(() => expect(onSnapshotMock).toHaveBeenCalledTimes(2))
    expect(bootstrapNewWorkspaceMock).not.toHaveBeenCalled()
  })
})

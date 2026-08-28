// Orquestra o resgate depois da autenticação (UI-SPEC Screen 4, E3, AUTH-05,
// D-07). Chama joinWorkspace uma única vez — useRef guarda contra o
// duplo-efeito do StrictMode em dev — e nunca mostra tela de confirmação:
// sucesso cai direto no Financeiro; falha vira uma das telas cheias de
// InviteErrorScreen. A tela não decide nada sozinha: toda a autorização
// real vive na Security Rule provada no plano 01-02 (T-01-02).
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { clearPendingInviteToken } from '@/features/invite/pendingToken'
import { joinWorkspace, JoinInviteError, type JoinInviteErrorCode } from '@/features/invite/join'
import { InviteErrorScreen } from './InviteErrorScreen'

export function JoinInviteScreen({ token, uid }: { token: string; uid: string }) {
  const navigate = useNavigate()
  const [errorCode, setErrorCode] = useState<JoinInviteErrorCode | null>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true

    joinWorkspace(token, uid)
      .then(() => {
        clearPendingInviteToken()
        // Sucesso: direto no Financeiro, nunca uma tela de confirmação
        // intermediária (D-07) — o WorkspaceProvider passa a resolver o
        // espaço do link normalmente a partir daqui.
        void navigate({ to: '/financeiro' })
      })
      .catch((error: unknown) => {
        clearPendingInviteToken()
        // WR-04: join.ts sempre lança JoinInviteError agora (a própria
        // reclassificação genérica dela usa 'unknown' para o que não é a
        // corrida de resgate concorrente confirmada) — este `: 'unknown'`
        // é só defesa em profundidade caso algo além de joinWorkspace()
        // lance aqui dentro (ex.: clearPendingInviteToken), nunca mais
        // reaproveita a cópia de "convite já usado" por padrão.
        setErrorCode(error instanceof JoinInviteError ? error.code : 'unknown')
      })
  }, [token, uid, navigate])

  if (errorCode) {
    return <InviteErrorScreen code={errorCode} />
  }

  // E3/loading — spinner em tela cheia, depois de autenticar e antes de
  // entrar no shell. Sem shell aqui: quem ainda não foi resgatado não
  // pertence a nenhum espaço.
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-md bg-dominant"
    >
      <span
        aria-hidden
        className="size-8 shrink-0 animate-spin rounded-full border-2 border-fg-muted border-t-transparent"
      />
      <span className="sr-only">Entrando no espaço…</span>
    </div>
  )
}

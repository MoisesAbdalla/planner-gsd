// As três telas cheias de falha do resgate por convite (UI-SPEC Screen 4,
// E3/error, T-01-21). Tela cheia — não diálogo — porque quem chega aqui
// ainda não pertence a nenhum espaço; não há shell para sobrepor nada.
// Nenhuma variante nomeia o espaço, mostra o id do espaço ou o token
// completo: quem vê esta tela é, por definição, alguém sem acesso.
import { Link } from '@tanstack/react-router'

import { Button } from '@/shared/ui/button'
import type { JoinInviteErrorCode } from '@/features/invite/join'

type Variant = { title: string; body: string }

// invite-not-found funde com a variante de convite expirado: distinguir os
// dois confirmaria a existência de um token para quem está tentando
// adivinhar (decisão registrada no plano 01-05, privacidade > precisão do
// diagnóstico).
const VARIANTS: Record<JoinInviteErrorCode, Variant> = {
  'invite-expired': {
    title: 'Esse link não é mais válido.',
    body: 'Convites duram 7 dias por segurança. Peça para quem te convidou gerar um link novo.',
  },
  'invite-not-found': {
    title: 'Esse link não é mais válido.',
    body: 'Convites duram 7 dias por segurança. Peça para quem te convidou gerar um link novo.',
  },
  'invite-already-used': {
    title: 'Esse convite já foi usado.',
    body: 'Cada link serve para uma entrada só. Peça um link novo para continuar.',
  },
  'already-in-workspace': {
    title: 'Você já faz parte de um espaço.',
    body: 'Por enquanto cada pessoa participa de um espaço só. Se quiser entrar neste, fale com quem te convidou.',
  },
}

export function InviteErrorScreen({ code }: { code: JoinInviteErrorCode }) {
  const { title, body } = VARIANTS[code]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-lg bg-dominant px-md text-center">
      <div className="flex flex-col gap-xs">
        <h1 className="text-heading font-semibold text-fg">{title}</h1>
        <p className="text-body text-fg-muted">{body}</p>
      </div>
      {/* Único botão de ação: volta para a tela de entrar SEM o parâmetro
          de convite — entrar normal (e ganhar o próprio espaço) ou esperar
          um link novo, nunca uma tentativa automática de resgatar de
          novo. */}
      <Button asChild>
        <Link to="/entrar">Entrar</Link>
      </Button>
    </div>
  )
}

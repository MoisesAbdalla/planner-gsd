// Tela de entrar (UI-SPEC Screen 1) + ramo de resgate por convite (UI-SPEC
// Screen 4, D-01, D-07, plano 01-05). O parâmetro `convite` decide entre os
// dois: sem sessão, é SEMPRE esta mesma tela (nunca uma variante própria) —
// só depois de autenticar é que o resgate acontece, via JoinInviteScreen.
// Sem e-mail/senha (fora de escopo, PROJECT.md).
//
// O token precisa sobreviver ao redirect do Google: é gravado em
// sessionStorage (src/features/invite/pendingToken.ts) antes de
// signInWithGoogle() e lido de volta aqui na reabertura, como reforço caso a
// query string em si não sobreviva à ida-e-volta completa até
// accounts.google.com (01-RESEARCH.md §Firebase Auth Google numa SPA). O
// valor é apagado por JoinInviteScreen assim que o resgate resolve (sucesso
// ou falha) — uma abertura futura do app nunca tenta resgatar de novo um
// convite já decidido.
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { useAuth } from '@/shared/auth/AuthProvider'
import { signInWithGoogle } from '@/shared/auth/signIn'
import { JoinInviteScreen } from '@/features/invite/components/JoinInviteScreen'
import { readPendingInviteToken, writePendingInviteToken } from '@/features/invite/pendingToken'

export const entrarSearchSchema = z.object({
  convite: z.string().optional(),
})

function readInviteTokenFromLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return new URLSearchParams(window.location.search).get('convite') ?? undefined
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  )
}

export default function EntrarPage() {
  const { status, user } = useAuth()

  const urlToken = readInviteTokenFromLocation()
  const token = urlToken ?? readPendingInviteToken() ?? undefined

  useEffect(() => {
    if (urlToken) writePendingInviteToken(urlToken)
  }, [urlToken])

  // Com sessão já resolvida e um token em mãos, o resgate acontece aqui —
  // nunca cria um espaço novo para quem chegou por convite (D-07).
  if (token && status === 'signed-in' && user) {
    return <JoinInviteScreen token={token} uid={user.uid} />
  }

  return <SignInCard token={token} />
}

function SignInCard({ token }: { token?: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    setError(false)
    try {
      // Guardado ANTES do redirect — é a garantia de que o token sobrevive
      // à ida-e-volta completa até accounts.google.com, mesmo se a query
      // string `convite` não voltar junto com o retorno do provedor.
      if (token) writePendingInviteToken(token)
      // signInWithRedirect navega para fora do app — se a Promise resolver
      // sem redirecionar de fato (raro; alguns navegadores), fica em
      // loading até onAuthStateChanged assumir.
      await signInWithGoogle()
    } catch {
      setError(true)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dominant px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-heading font-semibold text-fg">Cotidiano</h1>
          <p className="text-body text-fg-muted">Seus dados ficam só entre vocês dois.</p>
        </div>

        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={loading}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface text-body font-semibold text-fg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
        >
          {loading ? (
            <span
              aria-hidden
              className="size-4 shrink-0 animate-spin rounded-full border-2 border-fg-muted border-t-transparent"
            />
          ) : (
            <GoogleGlyph />
          )}
          Entrar com o Google
        </button>

        {error && (
          <p role="alert" className="mt-2 text-label text-destructive">
            Não deu para entrar com o Google agora. Tenta de novo em instantes.
          </p>
        )}
      </div>
    </div>
  )
}

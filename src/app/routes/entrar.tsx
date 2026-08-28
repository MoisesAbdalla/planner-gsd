// Tela de entrar (UI-SPEC Screen 1). Tela cheia centralizada sobre a
// superfície dominante, card elevado com nome do app, frase de privacidade
// e o botão de login com o provedor Google — segue a marca própria do
// Google, não usa accent (UI-SPEC §Color, "Accent reserved for"). Sem
// e-mail/senha (fora de escopo, PROJECT.md).
//
// O search param `convite` já é declarado aqui (schema `entrarSearchSchema`,
// consumido por src/app/router.tsx) para a URL de convite funcionar desde
// já — o plano 01-05 acrescenta o comportamento de resgate em cima dele;
// esta task só declara a forma.
import { useState } from 'react'
import { z } from 'zod'

import { signInWithGoogle } from '@/shared/auth/signIn'

export const entrarSearchSchema = z.object({
  convite: z.string().optional(),
})

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    setError(false)
    try {
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
    <div className="flex min-h-screen items-center justify-center bg-dominant px-md">
      <div className="w-full max-w-sm rounded-lg bg-surface p-xl shadow-sm">
        <div className="flex flex-col items-center gap-xs text-center">
          <h1 className="text-heading font-semibold text-fg">Cotidiano</h1>
          <p className="text-body text-fg-muted">Seus dados ficam só entre vocês dois.</p>
        </div>

        <button
          type="button"
          onClick={() => void handleSignIn()}
          disabled={loading}
          className="mt-lg flex h-11 w-full items-center justify-center gap-sm rounded-lg border border-border bg-surface text-body font-semibold text-fg outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
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
          <p role="alert" className="mt-sm text-label text-destructive">
            Não deu para entrar com o Google agora. Tenta de novo em instantes.
          </p>
        )}
      </div>
    </div>
  )
}

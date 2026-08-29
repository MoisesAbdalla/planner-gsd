// UI-SPEC E7/loading — primeiro frame de toda abertura do app: logo
// centralizada em tela cheia enquanto o Firebase Auth resolve se há
// sessão. Existe para nunca haver piscada de conteúdo não autenticado.
// BootErrorScreen (E7/error) cobre falha de rede na inicialização, com
// ação de repetir — nunca um shell vazio.
import { Button } from '@/shared/ui/button'

export function BootScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dominant"
    >
      <span className="text-display font-semibold text-fg">Cotidiano</span>
      <span className="sr-only">Carregando…</span>
    </div>
  )
}

export function BootErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-dominant px-4 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-heading font-semibold text-fg">Algo não funcionou.</h1>
        <p className="text-body text-fg-muted">Tenta de novo?</p>
      </div>
      <Button onClick={onRetry}>Tentar de novo</Button>
    </div>
  )
}

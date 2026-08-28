// Barra de navegação fixa embaixo — abaixo do breakpoint 768px (UI-SPEC
// §App Shell). Exatamente dois destinos (D-12): Financeiro e Tarefas. O
// item ativo combina três sinais ao mesmo tempo — ícone preenchido, rótulo
// em accent, pílula de fundo — cor nunca é o único portador de significado.
import { Link, useRouterState } from '@tanstack/react-router'
import { ListChecks, Wallet } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { writeLastModule, type ModuleId } from './lastModule'

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof Wallet; module: ModuleId }> = [
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, module: 'financeiro' },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks, module: 'tarefas' },
]

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      aria-label="Navegação principal"
      // pb: env(safe-area-inset-bottom) somado ao xs — não colide com a
      // barra de gestos do iOS (UI-SPEC §Spacing Scale, Exceptions).
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface pb-[calc(env(safe-area-inset-bottom)+var(--spacing-xs))] md:hidden"
    >
      {NAV_ITEMS.map(({ to, label, icon: Icon, module }) => {
        const active = pathname.startsWith(to)
        return (
          <Link
            key={to}
            to={to}
            onClick={() => writeLastModule(module)}
            aria-current={active ? 'page' : undefined}
            // min-h-11: alvo de toque de 44px (UI-SPEC Spacing Scale, Exceptions).
            className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2"
          >
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-full transition-colors',
                active && 'bg-accent/15',
              )}
            >
              <Icon
                className={cn('size-5', active ? 'text-accent' : 'text-fg-muted')}
                fill={active ? 'currentColor' : 'none'}
                fillOpacity={active ? 0.15 : undefined}
              />
            </span>
            <span className={cn('text-label', active ? 'font-semibold text-accent' : 'text-fg-muted')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

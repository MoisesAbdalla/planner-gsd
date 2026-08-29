// Rail lateral — a partir do breakpoint 768px (UI-SPEC §App Shell), 240px
// de largura (w-60), sobre a superfície elevada. Do topo para baixo: nome
// do espaço + avatar, depois os dois destinos de navegação (D-12).
import { Link, useRouterState } from '@tanstack/react-router'
import { ListChecks, Wallet } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { WorkspaceNameField } from '@/shared/workspace/WorkspaceNameField'
import { AvatarMenu } from './AvatarMenu'
import { writeLastModule, type ModuleId } from './lastModule'

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof Wallet; module: ModuleId }> = [
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, module: 'financeiro' },
  { to: '/tarefas', label: 'Tarefas', icon: ListChecks, module: 'tarefas' },
]

export function SideRail() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <aside className="hidden w-60 shrink-0 flex-col gap-8 border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="flex items-center justify-between gap-2">
        <WorkspaceNameField className="min-w-0 flex-1" />
        <AvatarMenu />
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, module }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              onClick={() => writeLastModule(module)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                // min-h-11: alvo de toque de 44px.
                'flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-body',
                active ? 'bg-accent/15 font-semibold text-accent' : 'text-fg-muted hover:bg-muted',
              )}
            >
              <Icon className="size-5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : undefined} />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

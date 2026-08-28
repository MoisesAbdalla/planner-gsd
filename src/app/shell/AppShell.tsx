// Layout herdado por todas as telas das Fases 2-6 (D-12). Troca de
// superfície no breakpoint 768px (Tailwind "md", padrão do framework —
// UI-SPEC §App Shell): abaixo, barra superior fina + barra de navegação
// fixa embaixo; a partir dali, rail lateral fixo de 240px substitui as
// duas. Nunca as duas superfícies ao mesmo tempo.
//
// Nome do espaço + avatar aparecem em DOIS lugares no código (aqui, na
// barra mobile, e dentro de SideRail para o desktop) porque são duas
// superfícies visuais distintas, não uma condicionada via CSS só — cada
// uma tem seu próprio layout (linha vs. coluna) e contexto de toque.
import type { ReactNode } from 'react'

import { WorkspaceNameField } from '@/shared/workspace/WorkspaceNameField'
import { AvatarMenu } from './AvatarMenu'
import { BottomNav } from './BottomNav'
import { SideRail } from './SideRail'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dominant md:flex">
      <SideRail />

      <div className="flex min-h-screen flex-1 flex-col">
        {/* Barra superior — só abaixo de 768px; a partir dali o rail já
            carrega nome do espaço + avatar. */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-sm border-b border-border bg-surface px-md md:hidden">
          <WorkspaceNameField className="min-w-0 flex-1" />
          <AvatarMenu />
        </header>

        {/* pb-24: limpa a barra de navegação fixa embaixo no mobile
            (~64px + safe-area-inset-bottom). */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="mx-auto w-full max-w-6xl px-md py-lg md:px-xl md:py-xl 2xl:px-3xl">
            {children}
          </div>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}

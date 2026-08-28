// Superfície global de toast (UI-SPEC "Falha ao salvar" — toda falha de
// gravação em qualquer tela usa esta mesma cópia com ação "Tentar de
// novo"). theme="system" em vez de next-themes (não usado neste projeto —
// SPA Vite, tema segue prefers-color-scheme puro, D-16).
import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner'

function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="system"
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--color-popover)',
          '--normal-text': 'var(--color-popover-foreground)',
          '--normal-border': 'var(--color-border)',
          '--border-radius': 'var(--radius-lg)',
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'text-body',
          actionButton: 'font-semibold',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

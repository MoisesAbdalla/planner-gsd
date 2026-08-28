// Nome do espaço editável no cabeçalho (UI-SPEC Screen 8, D-08). Tocar/
// clicar transforma o texto num input no próprio lugar — sem diálogo
// separado. Salva ao perder o foco ou com Enter; cancela com Escape. Nome
// vazio é recusado (E6/empty); falha reverte ao valor anterior e dispara o
// toast global de "tentar de novo" (E6/error) — nunca fica exibindo um
// valor que não foi gravado. Consumido por AppShell (cabeçalho mobile) e
// SideRail (topo do rail desktop) — plano 01-03/Task 2, ver SUMMARY sobre
// por que este arquivo (nominalmente da Task 3) nasceu junto com o shell.
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'

import { db } from '@/shared/firebase/client'
import { cn } from '@/shared/lib/utils'
import { useWorkspace } from './WorkspaceProvider'

const EMPTY_NAME_MESSAGE = 'O espaço precisa de um nome.'
const SAVE_FAILURE_MESSAGE = 'Não deu para salvar. Tenta de novo?'
const RETRY_LABEL = 'Tentar de novo'

export function WorkspaceNameField({ className }: { className?: string }) {
  const { workspace } = useWorkspace()
  const name = workspace?.name ?? ''

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // WR-03: guarda de reentrância para commit(). `saving` (estado React) não
  // serve para isso — o handler de onBlur do <input> ainda visível captura o
  // valor de `saving` do render em que foi criado, então checá-lo dentro de
  // commit() não veria a mudança feita pela PRIMEIRA chamada até o próximo
  // render. Um `useRef` é mutável e lido por referência, então reflete
  // "existe um commit em voo" mesmo antes de qualquer re-render:
  // handleKeyDown no Enter chama commit(), que faz setSaving(true) de forma
  // síncrona antes do primeiro await; como o componente troca de subárvore
  // (spinner no lugar do <input>) assim que saving=true, remover o <input>
  // ainda focado dispara blur/focusout de forma síncrona em navegador real
  // (jsdom não reproduz isso — daí este bug escapar de tests/shell.test.tsx
  // originalmente), e o onBlur reentraria em commit() com o mesmo valor
  // antes do primeiro updateDoc resolver, disparando uma escrita duplicada.
  const committingRef = useRef(false)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  function startEditing() {
    if (!workspace) return
    setDraft(name)
    setError(null)
    setEditing(true)
  }

  async function commit(value: string) {
    if (!workspace || committingRef.current) return
    const trimmed = value.trim()

    if (!trimmed) {
      setError(EMPTY_NAME_MESSAGE)
      return
    }
    if (trimmed === name) {
      setEditing(false)
      setError(null)
      return
    }

    committingRef.current = true
    setSaving(true)
    setError(null)
    try {
      await updateDoc(doc(db, 'workspaces', workspace.id), { name: trimmed })
      setEditing(false)
    } catch {
      // E6/error: o nome exibido volta ao valor anterior — nunca fica
      // mostrando algo que não foi gravado de verdade.
      setDraft(name)
      setEditing(false)
      toast.error(SAVE_FAILURE_MESSAGE, {
        action: { label: RETRY_LABEL, onClick: () => void commit(trimmed) },
      })
    } finally {
      committingRef.current = false
      setSaving(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      void commit(draft)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setDraft(name)
      setError(null)
      setEditing(false)
    }
  }

  if (saving) {
    // E6/loading: spinner pequeno no lugar do input durante a gravação.
    return (
      <div className={cn('flex h-11 min-w-0 items-center gap-2', className)}>
        <span
          aria-hidden
          className="size-4 shrink-0 animate-spin rounded-full border-2 border-fg-muted border-t-transparent"
        />
        <span className="sr-only">Salvando nome do espaço…</span>
      </div>
    )
  }

  if (editing) {
    return (
      <div className={cn('flex min-w-0 max-w-full flex-col gap-0.5', className)}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit(draft)}
          onKeyDown={handleKeyDown}
          maxLength={60}
          aria-label="Nome do espaço"
          aria-invalid={error ? true : undefined}
          // w-full + min-w-0: o input nunca expande além da largura da
          // barra que o contém (E6/long-text).
          className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-2 text-heading font-semibold text-fg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        {error && <span className="text-label text-destructive">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      disabled={!workspace}
      title={name}
      // min-h-11: alvo de toque de 44px. truncate + min-w-0: nome longo
      // trunca com reticências sem empurrar o avatar para fora (E6/overflow).
      className={cn(
        'min-h-11 min-w-0 max-w-full truncate rounded-md px-2 text-left text-heading font-semibold text-fg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
        className,
      )}
    >
      {name || '—'}
    </button>
  )
}

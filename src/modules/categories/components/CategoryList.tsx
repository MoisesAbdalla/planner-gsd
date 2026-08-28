// Tela de categorias (UI-SPEC Screen 5) — os cinco estados de E4:
// carregando (spinner central, sem esqueleto — decisão transversal do
// UI-SPEC), erro (toast global com "tentar de novo"), vazio (cópia
// defensiva do Copywriting Contract — na prática inalcançável, já que o
// espaço nasce com 12 categorias e Outros nunca arquiva), preenchido (uma
// linha por categoria ativa) e parcial (arquivadas atrás do controle de
// mostrar as arquivadas, fechado por padrão, agrupadas ao final e
// esmaecidas). O botão "Nova categoria" fica FIXO NO TOPO da lista — nunca
// um botão flutuante sobre o conteúdo (D-19: FAB lê "app Material").
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { useWorkspace } from '@/shared/workspace/WorkspaceProvider'
// Alias: o listener reativo de categorias aparece numa única linha do
// arquivo (mesmo padrão já usado por ArchiveCategoryDialog.tsx).
import { useCategories as readCategories } from '@/modules/categories/hooks/useCategories'
import type { Category } from '@/modules/categories/data/refs'
import { CategoryRow } from './CategoryRow'
import { CategoryFormDialog } from './CategoryFormDialog'

// E4/error: falha ao CARREGAR usa a cópia genérica de erro do Copywriting
// Contract — distinta de "Não deu para salvar", reservada para falha de
// GRAVAÇÃO (criar/editar/arquivar categoria, nome do espaço, convite).
const LOAD_FAILURE_MESSAGE = 'Algo não funcionou. Tenta de novo?'
const RETRY_LABEL = 'Tentar de novo'
const EMPTY_HEADING = 'Nenhuma categoria por aqui'
const EMPTY_BODY = 'Crie uma categoria para organizar seus gastos.'

function CenteredSpinner() {
  return (
    <div className="flex min-h-40 items-center justify-center" role="status">
      <span
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-fg-muted border-t-transparent"
      />
      <span className="sr-only">Carregando categorias…</span>
    </div>
  )
}

export function CategoryList() {
  const { workspace } = useWorkspace()

  // Nenhum workspace resolvido ainda (WorkspaceProvider ainda carregando) —
  // mesmo indicador central de espera, sem esqueleto de conteúdo.
  if (!workspace) return <CenteredSpinner />

  return <CategoryListBody workspaceId={workspace.id} />
}

function CategoryListBody({ workspaceId }: { workspaceId: string }) {
  // key={retryKey}: força um remount completo (e portanto uma nova
  // assinatura onSnapshot do listener de categorias) quando o toast de erro
  // chama a ação de "tentar de novo" — o hook não expõe um refetch próprio.
  const [retryKey, setRetryKey] = useState(0)
  return (
    <CategoryListInner
      key={retryKey}
      workspaceId={workspaceId}
      onRetry={() => setRetryKey((k) => k + 1)}
    />
  )
}

function CategoryListInner({
  workspaceId,
  onRetry,
}: {
  workspaceId: string
  onRetry: () => void
}) {
  const { active, archived, loading, error } = readCategories(workspaceId)
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (error) {
      toast.error(LOAD_FAILURE_MESSAGE, { action: { label: RETRY_LABEL, onClick: onRetry } })
    }
  }, [error, onRetry])

  // Todas as categorias do espaço (ativas + arquivadas) — repassadas ao
  // formulário de criar/editar para a checagem de nome duplicado.
  const allCategories: Category[] = [...active, ...archived]
  const isEmpty = !loading && !error && active.length === 0 && archived.length === 0

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h1 className="text-heading font-semibold text-fg">Categorias</h1>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden className="size-4" />
          Nova categoria
        </Button>
      </div>

      {loading && <CenteredSpinner />}

      {isEmpty && (
        <div className="flex flex-col items-start gap-xs">
          <p className="text-body font-semibold text-fg">{EMPTY_HEADING}</p>
          <p className="text-body text-fg-muted">{EMPTY_BODY}</p>
        </div>
      )}

      {!loading && !isEmpty && (
        <>
          {/* min-w-0: cada CategoryRow trunca o nome com ellipsis sem
              nunca provocar rolagem horizontal (PLAT-02). */}
          <ul className="flex min-w-0 flex-col gap-xs">
            {active.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                workspaceId={workspaceId}
                categories={allCategories}
              />
            ))}
          </ul>

          {archived.length > 0 && (
            <div className="flex flex-col gap-xs">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((v) => !v)}
                className="self-start rounded-md text-label font-semibold text-fg-muted hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                Mostrar arquivadas ({archived.length})
              </button>

              {showArchived && (
                // archived já vem ordenada por nome (mesmo filtro do array
                // ordenado devolvido pelo listener) — nunca intercalada com
                // as ativas (CAT-04 ordering).
                <ul className="flex min-w-0 flex-col gap-xs">
                  {archived.map((category) => (
                    <CategoryRow
                      key={category.id}
                      category={category}
                      archived
                      workspaceId={workspaceId}
                      categories={allCategories}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      <CategoryFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        categories={allCategories}
        editingCategory={null}
      />
    </div>
  )
}

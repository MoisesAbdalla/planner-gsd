// Uma linha da lista de categorias (UI-SPEC Screen 5): ponto de cor + nome
// escrito + ação de editar + ação de arquivar. O nome escrito é obrigatório
// em toda linha — cor sozinha nunca carrega significado
// (must_haves.prohibitions do plano 01-06). A ação de arquivar não aparece
// quando o documento tem canArchive=false (a categoria Outros, D-11) — a
// regra do servidor (plano 01-04) nega a escrita de qualquer forma, esta é
// só a primeira camada de defesa. Categoria arquivada: só o TEXTO do nome
// fica esmaecido (opacidade reduzida), o ponto de cor permanece na cor real
// (UI-SPEC Screen 5).
//
// Cada linha é dona do seu próprio diálogo de editar (CategoryFormDialog) e
// de arquivar (ArchiveCategoryDialog) — as duas rotas de interação vivem
// aqui para que CategoryList não precise conhecer nenhum dos dois diálogos.
import { useState, type CSSProperties } from 'react'
import { Archive, Pencil } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { CATEGORY_COLOR_TOKENS, type CategoryColorId } from '@/shared/theme/tokens'
import type { Category } from '@/modules/categories/data/refs'
import { CategoryFormDialog } from './CategoryFormDialog'
import { ArchiveCategoryDialog } from './ArchiveCategoryDialog'

export function CategoryRow({
  category,
  archived = false,
  workspaceId,
  categories,
}: {
  category: Category
  archived?: boolean
  workspaceId: string
  /** Todas as categorias do espaço — repassadas ao diálogo de editar para a
   * checagem de nome duplicado (ignorando a própria categoria). */
  categories: ReadonlyArray<Category>
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  const tokens =
    CATEGORY_COLOR_TOKENS[category.color as CategoryColorId] ?? CATEGORY_COLOR_TOKENS.outros

  return (
    <li className="flex min-w-0 items-center gap-sm rounded-lg px-sm py-sm">
      <span
        aria-hidden
        data-category-swatch
        style={{ '--cc-light': tokens.light, '--cc-dark': tokens.dark } as CSSProperties}
        className="size-3 shrink-0 rounded-full"
      />

      <span className={cn('min-w-0 flex-1 truncate text-body text-fg', archived && 'opacity-50')}>
        {category.name}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Editar ${category.name}`}
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-4" />
      </Button>

      {/* Categoria já arquivada não oferece a ação de novo — não existe
          fluxo de desarquivar nesta fase (Assumption #2 do plano 01-06). */}
      {!archived && category.canArchive && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Arquivar ${category.name}`}
          onClick={() => setArchiveOpen(true)}
        >
          <Archive className="size-4" />
        </Button>
      )}

      <CategoryFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        workspaceId={workspaceId}
        categories={categories}
        editingCategory={category}
      />

      {!archived && category.canArchive && (
        <ArchiveCategoryDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          workspaceId={workspaceId}
          category={category}
        />
      )}
    </li>
  )
}

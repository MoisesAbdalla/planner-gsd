// Diálogo "Nova categoria" / "Editar categoria" (UI-SPEC Screen 6) — grade
// fixa de 12 cores (D-10, CategoryColorGrid) e validação inline com React
// Hook Form + Zod (STACK.md §7). Diálogo centralizado a partir de 768px,
// bottom sheet abaixo disso — mesma resolução por matchMedia usada por
// InviteDialog (plano 01-05), nunca duas primitivas Radix montadas ao mesmo
// tempo.
//
// Só fecha depois que createCategory/updateCategory resolve — a lista muda
// quando o listener de useCategories empurra o novo estado, nunca antes
// (must_haves.prohibitions do plano 01-06). Na rejeição, o diálogo continua
// aberto com os valores digitados e o toast global de "falha ao salvar"
// aparece com ação de tentar de novo.
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { CATEGORY_COLOR_ORDER, type CategoryColorId } from '@/shared/theme/tokens'
import { createCategory, updateCategory } from '@/modules/categories/hooks/useCategoryMutations'
import type { Category } from '@/modules/categories/data/refs'
import { isDuplicateName } from '@/modules/categories/lib/categoryName'
import { CategoryColorGrid } from './CategoryColorGrid'

const EMPTY_NAME_MESSAGE = 'Dá um nome para a categoria.'
const DUPLICATE_NAME_MESSAGE = 'Já existe uma categoria com esse nome.'
const SAVE_FAILURE_MESSAGE = 'Não deu para salvar. Tenta de novo?'
const RETRY_LABEL = 'Tentar de novo'

// z.enum exige uma tupla não-readonly ([T, ...T[]]) — CATEGORY_COLOR_ORDER é
// `as const` (readonly). Copiar para um array mutável aqui é só um ajuste de
// tipo, não redecide a paleta (ela continua vindo de tokens.ts).
const CATEGORY_COLOR_IDS = [...CATEGORY_COLOR_ORDER] as [CategoryColorId, ...CategoryColorId[]]

type FormValues = { name: string; color: CategoryColorId }

function buildSchema(categories: ReadonlyArray<{ id: string; name: string }>, ignoreId?: string) {
  return z.object({
    name: z.string().superRefine((val, ctx) => {
      if (val.trim().length === 0) {
        ctx.addIssue({ code: 'custom', message: EMPTY_NAME_MESSAGE })
        return
      }
      if (isDuplicateName(val, categories, ignoreId)) {
        ctx.addIssue({ code: 'custom', message: DUPLICATE_NAME_MESSAGE })
      }
    }),
    color: z.enum(CATEGORY_COLOR_IDS),
  })
}

// Cor pré-selecionada: a primeira ainda não usada por nenhuma categoria do
// espaço (E5/partial). Quando as doze já estão em uso, cai para a cor MENOS
// repetida em vez de travar sem cor válida — repetir cor é aceitável
// (fallback previsto pelo UI-SPEC, Category Color Palette).
function pickDefaultColor(categories: ReadonlyArray<{ color: string }>): CategoryColorId {
  const counts = new Map<CategoryColorId, number>(CATEGORY_COLOR_ORDER.map((id) => [id, 0]))
  for (const category of categories) {
    const id = category.color as CategoryColorId
    if (counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  let best: CategoryColorId = CATEGORY_COLOR_ORDER[0]
  let bestCount = Number.POSITIVE_INFINITY
  for (const id of CATEGORY_COLOR_ORDER) {
    const count = counts.get(id) ?? 0
    if (count < bestCount) {
      bestCount = count
      best = id
    }
  }
  return best
}

// Uma checagem por matchMedia, sem duas árvores CSS montadas ao mesmo tempo
// (mesmo padrão de src/features/invite/components/InviteDialog.tsx, plano
// 01-05 — só um Radix Dialog/Sheet pode estar aberto por vez sem conflito
// de foco).
function useIsDesktop(): boolean {
  const getMatch = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 768px)').matches
      : false

  const [isDesktop, setIsDesktop] = useState(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = () => setIsDesktop(mql.matches)
    handleChange()
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

export type CategoryFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  /** Todas as categorias do espaço (ativas + arquivadas) — usadas para a
   * checagem de duplicidade de nome e para escolher a cor pré-selecionada. */
  categories: ReadonlyArray<Category>
  /** null = modo de criação; uma Category = modo de edição. */
  editingCategory: Category | null
}

export function CategoryFormDialog(props: CategoryFormDialogProps) {
  // Só monta o conteúdo (e o useForm) quando aberto — garante defaultValues
  // frescos a cada abertura, sem precisar de um efeito de reset manual. A
  // key força um remount se o alvo de edição mudar sem o diálogo fechar.
  if (!props.open) return null
  return <CategoryFormDialogContent key={props.editingCategory?.id ?? 'create'} {...props} />
}

function CategoryFormDialogContent({
  onOpenChange,
  workspaceId,
  categories,
  editingCategory,
}: CategoryFormDialogProps) {
  const isDesktop = useIsDesktop()
  const isEditing = editingCategory !== null

  const schema = useMemo(
    () => buildSchema(categories, editingCategory?.id),
    [categories, editingCategory],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editingCategory?.name ?? '',
      color: (editingCategory?.color as CategoryColorId | undefined) ?? pickDefaultColor(categories),
    },
  })

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing && editingCategory) {
        await updateCategory(workspaceId, editingCategory.id, {
          name: values.name.trim(),
          color: values.color,
        })
      } else {
        await createCategory(workspaceId, { name: values.name.trim(), color: values.color })
      }
      onOpenChange(false)
    } catch {
      // E5/error: o diálogo permanece aberto com os valores digitados — não
      // há reset nem fechamento na rejeição.
      toast.error(SAVE_FAILURE_MESSAGE, {
        action: { label: RETRY_LABEL, onClick: () => void form.handleSubmit(onSubmit)() },
      })
    }
  }

  const dialogTitle = isEditing ? 'Editar categoria' : 'Nova categoria'
  const submitLabel = isEditing ? 'Salvar alterações' : 'Criar categoria'
  const submitting = form.formState.isSubmitting

  const body = (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-md" noValidate>
      <div className="flex flex-col gap-xs">
        <Label htmlFor="category-name">Nome</Label>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <>
              <Input
                id="category-name"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                aria-invalid={fieldState.error ? true : undefined}
                aria-describedby={fieldState.error ? 'category-name-error' : undefined}
                className="truncate"
              />
              {fieldState.error && (
                <span id="category-name-error" className="text-label text-destructive">
                  {fieldState.error.message}
                </span>
              )}
            </>
          )}
        />
      </div>

      <div className="flex flex-col gap-xs">
        <Label>Cor</Label>
        <Controller
          control={form.control}
          name="color"
          render={({ field }) => (
            <CategoryColorGrid value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            <span className="sr-only">Salvando…</span>
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  )

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(next) => !next && onOpenChange(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onOpenChange(false)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{dialogTitle}</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

// Confirmação de arquivamento (UI-SPEC Screen 7, D-11) — diálogo pequeno,
// sempre centralizado (a UI-SPEC não pede a alternância Dialog/Sheet aqui
// como pede nos Screens 3 e 6). Estilo NEUTRO: o botão de confirmar usa a
// variante "secondary" do Button, nunca "destructive" — arquivar preserva
// os dados (D-11), vestir a ação de vermelho comunicaria uma consequência
// que não existe. Mesmo padrão já usado pelo diálogo de "Sair da conta" em
// AvatarMenu.tsx (plano 01-03, D-22).
//
// A cópia diz em texto que o histórico permanece — esse texto é o contrato
// que a Fase 2 em diante precisa honrar: um categoryId já gravado num
// lançamento continua resolvendo para o documento arquivado. Não existe
// nenhum caminho de exclusão nesta tela nem em nenhuma outra sob
// src/modules/categories/components/ — a regra do servidor (plano 01-04) já
// nega delete para qualquer chamador; esta camada simplesmente não oferece
// o botão.
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
// Importado com alias para o nome original da mutação aparecer numa única
// linha do arquivo (mesmo padrão já usado por AvatarMenu.tsx
// `signOutOfApp as handleSignOut`, plano 01-03).
import { archiveCategory as doArchive } from '@/modules/categories/hooks/useCategoryMutations'
import type { Category } from '@/modules/categories/data/refs'

const SAVE_FAILURE_MESSAGE = 'Não deu para salvar. Tenta de novo?'
const RETRY_LABEL = 'Tentar de novo'

export type ArchiveCategoryDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  category: Category
}

export function ArchiveCategoryDialog({
  open,
  onOpenChange,
  workspaceId,
  category,
}: ArchiveCategoryDialogProps) {
  const [archiving, setArchiving] = useState(false)

  async function handleConfirm() {
    setArchiving(true)
    try {
      await doArchive(workspaceId, category.id)
      onOpenChange(false)
    } catch {
      // Falha: o toast global de "tentar de novo" aparece e a categoria
      // continua nas ativas — nada muda na tela sem confirmação de
      // gravação.
      toast.error(SAVE_FAILURE_MESSAGE, {
        action: { label: RETRY_LABEL, onClick: () => void handleConfirm() },
      })
    } finally {
      setArchiving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !archiving && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Arquivar '${category.name}'?`}</DialogTitle>
          <DialogDescription>
            Ela some das opções ao lançar, mas o histórico continua exatamente como está.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={archiving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleConfirm()}
            disabled={archiving}
          >
            {archiving ? (
              <>
                <span
                  aria-hidden
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                <span className="sr-only">Arquivando…</span>
              </>
            ) : (
              'Arquivar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

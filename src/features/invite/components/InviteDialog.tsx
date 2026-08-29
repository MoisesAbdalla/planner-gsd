// Diálogo "Convidar alguém" (UI-SPEC Screen 3, AUTH-04, D-01). Gera o link
// ao montar, sempre em um toque: campo somente-leitura + CTA primário de
// compartilhar no WhatsApp (o gesto real descrito pelo usuário, D-01) + CTA
// secundário de copiar. Diálogo centralizado a partir de 768px, folha
// inferior abaixo disso — a escolha de qual primitiva montar (Dialog vs
// Sheet) é feita uma única vez por matchMedia, nunca as duas montadas ao
// mesmo tempo (evitaria dois modais Radix competindo por foco).
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { readLastModule } from '@/app/shell/lastModule'
import { useAuth } from '@/shared/auth/AuthProvider'
import { useWorkspace } from '@/shared/workspace/WorkspaceProvider'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { createInvite, inviteUrl } from '@/features/invite/data/invites'

const SAVE_FAILURE_MESSAGE = 'Não deu para salvar. Tenta de novo?'
const RETRY_LABEL = 'Tentar de novo'
const LINK_COPIED_MESSAGE = 'Link copiado!'

function lastModuleRoute(): '/financeiro' | '/tarefas' {
  return readLastModule() === 'tarefas' ? '/tarefas' : '/financeiro'
}

// Uma checagem por matchMedia, sem depender de duas árvores CSS montadas ao
// mesmo tempo (o padrão usado por BottomNav/SideRail para o resto do shell,
// que não são modais e por isso podem coexistir escondidos via CSS).
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

function whatsappShareUrl(link: string): string {
  const message = `Oi! Te chamei pro nosso espaço financeiro no Cotidiano — é só abrir esse link e entrar com sua conta Google: ${link}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function InviteDialog() {
  const navigate = useNavigate()
  const { workspace } = useWorkspace()
  const { user } = useAuth()
  const isDesktop = useIsDesktop()

  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Gerar um convite novo NÃO invalida os anteriores — não existe lista de
  // convites ativos nesta versão (decisão registrada no plano 01-02). Este
  // diálogo só cuida do link mais recente.
  const generateInvite = useCallback(() => {
    if (!workspace || !user) return
    setLoading(true)
    createInvite(workspace.id, user.uid)
      .then((newToken) => setToken(newToken))
      .catch(() => {
        // E2/error: falha ao gerar dispara o toast global de "falha ao
        // salvar" com ação de tentar de novo — mesma cópia/mecanismo usado
        // por categoria e nome do espaço (decisão transversal do UI-SPEC).
        toast.error(SAVE_FAILURE_MESSAGE, {
          action: { label: RETRY_LABEL, onClick: () => generateInvite() },
        })
      })
      .finally(() => setLoading(false))
  }, [workspace, user])

  useEffect(() => {
    generateInvite()
  }, [generateInvite])

  function handleOpenChange(open: boolean) {
    // Fechar (X, Escape, clique fora) volta para o módulo anterior — a rota
    // /convidar só existe para hospedar este diálogo por cima do shell.
    if (!open) void navigate({ to: lastModuleRoute() })
  }

  const link = token ? inviteUrl(token) : ''
  const actionsDisabled = loading || !link

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      toast.success(LINK_COPIED_MESSAGE)
    } catch {
      toast.error(SAVE_FAILURE_MESSAGE, {
        action: { label: RETRY_LABEL, onClick: () => void handleCopy() },
      })
    }
  }

  function handleShareWhatsApp() {
    if (!link) return
    window.open(whatsappShareUrl(link), '_blank', 'noopener,noreferrer')
  }

  const body = (
    <div className="flex flex-col gap-4">
      {loading ? (
        // E2/loading: o spinner ocupa o lugar do campo enquanto o convite é
        // gerado — nunca o campo com um valor vazio/placeholder.
        <div className="flex h-11 items-center gap-2 rounded-lg border border-border px-4">
          <span
            aria-hidden
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-fg-muted border-t-transparent"
          />
          <span className="sr-only">Gerando link de convite…</span>
        </div>
      ) : (
        // readOnly + input nativo: rola horizontalmente DENTRO do próprio
        // campo para uma URL longa, nunca estoura o diálogo nem provoca
        // rolagem horizontal na página (E2/overflow, PLAT-02).
        <Input
          readOnly
          aria-label="Link do convite"
          value={link}
          onFocus={(event) => event.currentTarget.select()}
        />
      )}

      {/* Primário: compartilhar no WhatsApp — o gesto real descrito pelo
          usuário (D-01), não "copiar". */}
      <Button type="button" onClick={handleShareWhatsApp} disabled={actionsDisabled}>
        Compartilhar no WhatsApp
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => void handleCopy()}
        disabled={actionsDisabled}
      >
        Copiar link
      </Button>

      {/* Sem "sm de rodapé": Label a 70% de opacidade em vez de um quinto
          tamanho de tipografia (UI-SPEC §Typography). */}
      <p className="text-label text-fg-muted/70">Válido por 7 dias, uso único.</p>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar alguém</DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open onOpenChange={handleOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Convidar alguém</SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  )
}

// Rota "/convidar" — monta o diálogo real de convite sobre o shell (UI-SPEC
// Screen 3, plano 01-05). Fechar o diálogo (X, Escape, clique fora, ou
// concluir a ação) volta para o módulo anterior — ver
// InviteDialog.handleOpenChange.
import { InviteDialog } from '@/features/invite/components/InviteDialog'

export default function ConvidarPage() {
  return <InviteDialog />
}

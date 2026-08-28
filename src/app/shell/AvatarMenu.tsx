// Menu do avatar (D-14) — Categorias, Convidar alguém, Sair da conta. Não é
// um terceiro destino de navegação, vive só dentro deste dropdown. Sair da
// conta abre um diálogo de confirmação neutro (D-22: sair não apaga nada)
// antes de invalidar a sessão.
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, Tags, UserPlus } from 'lucide-react'

// Import com alias, referenciado uma única vez neste arquivo — o clique
// chama handleSignOut(), nunca o nome original retipado.
import { signOutOfApp as handleSignOut } from '@/shared/auth/signIn'
import { useAuth } from '@/shared/auth/AuthProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

function initialFrom(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.trim() || ''
  return source ? source.charAt(0).toUpperCase() : '?'
}

export function AvatarMenu() {
  const { user } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Abrir menu da conta"
          className="min-h-11 min-w-11 shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Avatar>
            {user?.photoURL && <AvatarImage src={user.photoURL} alt="" />}
            <AvatarFallback>{initialFrom(user?.displayName, user?.email)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem asChild>
            <Link to="/categorias">
              <Tags className="size-4" />
              Categorias
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/convidar">
              <UserPlus className="size-4" />
              Convidar alguém
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <LogOut className="size-4" />
            Sair da conta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da conta?</DialogTitle>
            <DialogDescription>
              Você pode entrar de novo quando quiser — nada muda no espaço.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            {/* Neutro (secondary), nunca destructive — sair não apaga nada (D-22). */}
            <Button variant="secondary" onClick={() => void handleSignOut()}>
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

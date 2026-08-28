// Avatar do Google no cabeçalho/rail — abre o menu do avatar (D-14). O
// preset original inclui AvatarBadge/AvatarGroup (status online, grupos);
// omitidos aqui por não terem uso nesta fase nem nas Fases 2-6 conhecidas —
// reintroduzir é copiar a primitiva Radix novamente, sem migração.
import * as React from 'react'
import { Avatar as AvatarPrimitive } from 'radix-ui'

import { cn } from '@/shared/lib/utils'

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        'relative flex size-11 shrink-0 overflow-hidden rounded-full select-none after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:border after:border-border',
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center bg-muted text-label font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }

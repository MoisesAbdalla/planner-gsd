// Helper canônico do shadcn (registry "utils", pacote radix-nova) — mescla
// classes Tailwind com precedência correta (tailwind-merge) a partir de
// entradas condicionais (clsx). Toda primitiva em src/shared/ui/ depende
// disto para aceitar um `className` de override no callsite.
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Preservação do token do convite através do redirect do Google (D-01,
// 01-RESEARCH.md §Firebase Auth Google numa SPA) — o parâmetro `convite` da
// URL nem sempre sobrevive à ida-e-volta completa até accounts.google.com,
// então o valor também é guardado em sessionStorage antes de
// signInWithGoogle() e lido de volta na abertura seguinte. Módulo
// compartilhado entre src/app/routes/entrar.tsx (que grava/lê) e
// src/shared/workspace/WorkspaceProvider.tsx (que só precisa perguntar "há
// um resgate pendente?" para nunca criar um espaço próprio enquanto isso
// está em aberto, D-07) — vive em src/features/invite/ para não forçar um
// import entre as duas árvores (app/routes e shared/workspace).
const STORAGE_KEY = 'cotidiano:pendingInviteToken'

export function readPendingInviteToken(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    // Armazenamento indisponível (modo privado, cota) — o pior caso é a
    // pessoa precisar reabrir o link de convite, nunca um crash.
    return null
  }
}

export function writePendingInviteToken(token: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, token)
  } catch {
    /* idem readPendingInviteToken */
  }
}

export function clearPendingInviteToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* idem readPendingInviteToken */
  }
}

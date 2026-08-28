import { GoogleAuthProvider, signInWithRedirect, signOut } from 'firebase/auth'
import { auth } from '../firebase/client'

// signInWithRedirect (não popup): mesmo caminho para o login normal e para a
// entrada por link de convite (01-RESEARCH.md §Firebase Auth Google numa
// SPA) — funciona igual em desktop e no navegador do celular, sem depender
// de popup, que é bloqueado com frequência em navegadores móveis.
export function signInWithGoogle(): Promise<void> {
  return signInWithRedirect(auth, new GoogleAuthProvider())
}

export function signOutOfApp(): Promise<void> {
  return signOut(auth)
}

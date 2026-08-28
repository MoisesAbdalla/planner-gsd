// Pattern 2 (01-RESEARCH.md): boot screen sem flash de conteúdo não
// autenticado. O estado inicial é sempre 'loading'; só decide entre
// signed-out/signed-in depois que onAuthStateChanged dispara pela primeira
// vez. getRedirectResult completa o retorno do signInWithRedirect ao Google.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { getRedirectResult, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase/client'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Erros aqui não bloqueiam onAuthStateChanged, que é a fonte real do
    // estado de sessão — um toast de "Falha no login do Google" cobre isso
    // na tela de entrada (fora do escopo desta task mínima).
    getRedirectResult(auth).catch(() => {
      /* tratado pela tela de sign-in a partir do plano 01-04 */
    })

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setStatus(nextUser ? 'signed-in' : 'signed-out')
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ status, user }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

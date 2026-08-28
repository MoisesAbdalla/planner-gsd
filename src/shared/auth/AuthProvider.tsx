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

// 'error' (plano 01-03): falha de REDE na inicialização do próprio
// listener de sessão (onAuthStateChanged nunca dispara com sucesso) —
// distinto de uma tentativa de login que falha (essa fica só na tela de
// entrar, E1/error, sem promover o status global). UI-SPEC E7/error: nunca
// um shell vazio, sempre a tela de erro genérica com ação de repetir.
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'error'

type AuthContextValue = {
  status: AuthStatus
  user: User | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Erro do PRÓPRIO signInWithRedirect (ex.: popup bloqueado, conta
    // recusada) não bloqueia onAuthStateChanged, que é a fonte real do
    // estado de sessão — a tela de entrar mostra o banner de erro (E1/error,
    // plano 01-03), sem promover o AuthStatus global.
    getRedirectResult(auth).catch(() => {
      /* tratado pela tela de entrar (src/app/routes/entrar.tsx) */
    })

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        setUser(nextUser)
        setStatus(nextUser ? 'signed-in' : 'signed-out')
      },
      () => {
        // Callback de erro do onAuthStateChanged — falha de rede real na
        // inicialização, não um caso de "sem sessão" (esse é sucesso com
        // user=null). E7/error: BootErrorScreen assume a partir daqui.
        setStatus('error')
      },
    )

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

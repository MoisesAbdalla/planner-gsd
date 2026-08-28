// Substitui a fatia mínima do plano 01-01 (três estados sem estilo). Monta
// os providers na ordem que suas dependências exigem — WorkspaceProvider
// lê useAuth() por dentro, então precisa estar dentro de AuthProvider; o
// AppRoot decide entre boot screen, tela de entrar e o roteador (ver
// src/app/router.tsx).
import { AuthProvider } from './shared/auth/AuthProvider'
import { WorkspaceProvider } from './shared/workspace/WorkspaceProvider'
import { Toaster } from './shared/ui/sonner'
import { AppRoot } from './app/router'

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Toaster />
        <AppRoot />
      </WorkspaceProvider>
    </AuthProvider>
  )
}

export default App

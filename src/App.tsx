// Fatia ponta a ponta mínima (Task 3, 01-01): três estados sem estilo
// elaborado — a linguagem visual da skill frontend-design chega no plano
// 01-04. Aqui só precisa provar que login -> workspace -> tela funciona.
import { AuthProvider, useAuth } from './shared/auth/AuthProvider'
import { signInWithGoogle } from './shared/auth/signIn'
import { WorkspaceProvider, useWorkspace } from './shared/workspace/WorkspaceProvider'

function AppShell() {
  const { status: authStatus, user } = useAuth()
  const { status: workspaceStatus, workspace } = useWorkspace()

  if (authStatus === 'loading') {
    return (
      <main style={{ padding: '2rem' }}>
        <p>Carregando…</p>
      </main>
    )
  }

  if (authStatus === 'signed-out') {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Cotidiano</h1>
        <button type="button" onClick={() => void signInWithGoogle()}>
          Entrar com o Google
        </button>
      </main>
    )
  }

  if (workspaceStatus !== 'ready' || !workspace) {
    return (
      <main style={{ padding: '2rem' }}>
        <p>Carregando…</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>{workspace.name}</h1>
      <p>{user?.email}</p>
    </main>
  )
}

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppShell />
      </WorkspaceProvider>
    </AuthProvider>
  )
}

export default App

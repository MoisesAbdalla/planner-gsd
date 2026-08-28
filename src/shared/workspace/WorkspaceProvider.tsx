// Resolve o workspaceId de /users/{uid}, faz bootstrap se ainda não existir,
// e assina /workspaces/{id} por onSnapshot — é esse listener que faz o nome
// do espaço na tela vir do banco, não de estado local.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/client'
import { useAuth } from '../auth/AuthProvider'
import { bootstrapNewWorkspace, resolveUserWorkspace, type Workspace } from './bootstrap'

type WorkspaceStatus = 'loading' | 'none' | 'ready'

type WorkspaceContextValue = {
  status: WorkspaceStatus
  workspace: Workspace | null
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  const [status, setStatus] = useState<WorkspaceStatus>('loading')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    if (authStatus !== 'signed-in' || !user) {
      setStatus(authStatus === 'loading' ? 'loading' : 'none')
      setWorkspace(null)
      return
    }

    let cancelled = false
    let unsubscribeSnapshot: (() => void) | undefined
    setStatus('loading')

    async function resolveAndSubscribe(uid: string) {
      const existingId = await resolveUserWorkspace(uid)
      const workspaceId = existingId ?? (await bootstrapNewWorkspace(uid))
      if (cancelled) return

      unsubscribeSnapshot = onSnapshot(doc(db, 'workspaces', workspaceId), (snap) => {
        if (!snap.exists()) {
          setWorkspace(null)
          setStatus('none')
          return
        }
        const data = snap.data() as Omit<Workspace, 'id'>
        setWorkspace({ id: snap.id, ...data })
        setStatus('ready')
      })
    }

    resolveAndSubscribe(user.uid).catch(() => {
      if (!cancelled) setStatus('none')
    })

    return () => {
      cancelled = true
      unsubscribeSnapshot?.()
    }
  }, [authStatus, user])

  return (
    <WorkspaceContext.Provider value={{ status, workspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace precisa estar dentro de <WorkspaceProvider>')
  return ctx
}

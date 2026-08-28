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
import * as categorySeeding from '../../modules/categories/data/seed'

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

      if (existingId) {
        // Resumabilidade (CAT-01/empty, 01-04): bootstrapNewWorkspace só
        // chama seedDefaultCategories no caminho de CRIAÇÃO do workspace.
        // No dia a dia (workspace já existia), completamos aqui a mesma
        // garantia — se um seeding anterior falhou no meio (crash entre
        // criar o workspace e terminar de semear), esta chamada idempotente
        // completa o que faltar sem duplicar (IDs determinísticos). Disparada
        // sem aguardar para não atrasar a assinatura do nome do espaço na
        // tela; falha aqui é silenciosa — não impede o app de abrir, só
        // deixa as categorias incompletas até a próxima tentativa.
        void categorySeeding.seedDefaultCategories(workspaceId).catch(() => {})
      }

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

// Listener em tempo real das categorias do espaço (AUTH-06). Os dois
// membros verem exatamente a mesma lista é consequência direta de os dois
// terem este mesmo onSnapshot aberto na mesma subcoleção
// (workspaces/{workspaceId}/categories, ordenada por name) — nenhum
// mecanismo adicional de sincronização existe nem deve ser construído
// (01-RESEARCH.md §Pattern 3).
//
// react-firebase-hooks (STACK.md §7): não empurramos o Firestore para
// dentro de um cache de query genérico — onSnapshot já É, ele mesmo, um
// cache reativo com push de atualizações.
//
// O filtro entre ativas e arquivadas acontece no CLIENTE sobre o mesmo
// listener, não em duas consultas — o volume é de dezenas de documentos e
// uma segunda consulta só somaria uma leitura por tela sem ganho.
import { useMemo } from 'react'
import { orderBy, query } from 'firebase/firestore'
import { useCollection } from 'react-firebase-hooks/firestore'
import { categoriesCollection, type Category } from '../data/refs'

export type UseCategoriesResult = {
  active: Category[]
  archived: Category[]
  loading: boolean
  error: Error | undefined
}

export function useCategories(workspaceId: string): UseCategoriesResult {
  const categoriesQuery = useMemo(
    () => query(categoriesCollection(workspaceId), orderBy('name')),
    [workspaceId],
  )

  const [snapshot, loading, error] = useCollection(categoriesQuery)

  return useMemo(() => {
    const docs = snapshot?.docs ?? []
    const all: Category[] = docs.map((d) => {
      // `id` não é um campo armazenado (vem do próprio snap.id) — ver
      // comentário em refs.ts.
      const data = d.data() as Omit<Category, 'id'>
      return { id: d.id, ...data }
    })

    return {
      active: all.filter((category) => category.archivedAt === null),
      archived: all.filter((category) => category.archivedAt !== null),
      loading,
      error,
    }
  }, [snapshot, loading, error])
}

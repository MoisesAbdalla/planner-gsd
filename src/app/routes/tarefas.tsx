// Destino "Tarefas" (D-12). Conteúdo real chega na Fase 6 — esta fase
// entrega o destino existir, renderizar dentro do AppShell e gravar o
// módulo visitado (D-13).
import { useEffect } from 'react'

import { writeLastModule } from '../shell/lastModule'

export default function TarefasPage() {
  useEffect(() => {
    writeLastModule('tarefas')
  }, [])

  return <h1 className="text-heading font-semibold text-fg">Tarefas</h1>
}

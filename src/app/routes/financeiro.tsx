// Destino "Financeiro" (D-12). Conteúdo real chega nas Fases 2-5 — esta
// fase entrega o destino existir, renderizar dentro do AppShell e gravar o
// módulo visitado (D-13).
import { useEffect } from 'react'

import { writeLastModule } from '../shell/lastModule'

export default function FinanceiroPage() {
  useEffect(() => {
    writeLastModule('financeiro')
  }, [])

  return <h1 className="text-heading font-semibold text-fg">Financeiro</h1>
}

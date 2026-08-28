// Persistência local do último módulo visitado (D-13). Único dado do
// espaço que pode viver em armazenamento local do navegador — um
// identificador de dois estados, sem conteúdo do espaço (T-01-16, disposição
// "mitigate" no <threat_model> do plano). O espaço em si é sempre lido do
// Firestore; isto só decide para onde a rota raiz redireciona.
export type ModuleId = 'financeiro' | 'tarefas'

const STORAGE_KEY = 'cotidiano:lastModule'

export function readLastModule(): ModuleId {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'tarefas' ? 'tarefas' : 'financeiro'
  } catch {
    // Armazenamento local indisponível (modo privado, cota, SSR de teste) —
    // primeiríssima abertura sempre cai em Financeiro (D-13).
    return 'financeiro'
  }
}

export function writeLastModule(id: ModuleId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Falha ao persistir não é crítica — a navegação em si já aconteceu;
    // só a próxima abertura do app não vai lembrar o módulo.
  }
}

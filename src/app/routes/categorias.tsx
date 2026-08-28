// Rota real de Categorias (UI-SPEC Screen 5, alcançável a partir do menu do
// avatar, D-14) — substitui o stub `<h1>` do plano 01-03. CategoryList já
// cobre os cinco estados de E4 e o layout responsivo (página cheia no
// mobile, painel largo a partir de 768px herda o padding do <main> de
// AppShell — plano 01-03) sem precisar de nenhum wrapper extra aqui.
import { CategoryList } from '@/modules/categories/components/CategoryList'

export default function CategoriasPage() {
  return <CategoryList />
}

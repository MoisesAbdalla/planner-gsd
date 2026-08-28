// Rota alcançável a partir do menu do avatar (D-14). O plano 01-06
// substitui este corpo pela tela real (lista de categorias, UI-SPEC Screen
// 5) sem tocar em router.tsx — esta fase só garante que a navegação até
// aqui já funciona ponta a ponta.
export default function CategoriasPage() {
  return <h1 className="text-heading font-semibold text-fg">Categorias</h1>
}

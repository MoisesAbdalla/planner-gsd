// Rota alcançável a partir do menu do avatar (D-14). O plano 01-05
// substitui este corpo pela tela real (UI-SPEC Screen 3, consumindo
// createInvite/inviteUrl do plano 01-02) sem tocar em router.tsx — esta
// fase só garante que a navegação até aqui já funciona ponta a ponta.
export default function ConvidarPage() {
  return <h1 className="text-heading font-semibold text-fg">Convidar alguém</h1>
}

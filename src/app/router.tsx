// Árvore de rotas + gate de autenticação. Padrão confirmado ao vivo contra
// o exemplo oficial do TanStack Router (examples/react/authenticated-routes
// -firebase, TanStack/router no GitHub) ANTES de codificar, conforme
// 01-RESEARCH.md §Lacunas pedia — não é mais [ASSUMED]:
//
// 1. Gate de "sessão ainda resolvendo" fica FORA do <RouterProvider> por
//    inteiro (AppRoot abaixo) — é literalmente o padrão do InnerApp/App do
//    exemplo oficial (`if (auth.isInitialLoading) return <Spinner />`).
//    Garante que /entrar nunca pisca antes de saber se já existe sessão
//    (UI-SPEC E7/loading) e que a árvore de rotas só monta com contexto de
//    auth já resolvido.
// 2. Gate de "signed-out" já com o RouterProvider montado fica em
//    `beforeLoad` de uma rota pathless (`_authenticated`), lançando
//    `redirect()` — é o padrão oficial documentado em
//    docs/router/guide/authenticated-routes.md ("Authentication using React
//    context/hooks") e no mesmo exemplo Firebase (rota `_auth`).
// 3. `router.invalidate()` depois que `status` muda enquanto o router já
//    está montado (ex.: sair da conta em qualquer tela) — sem isso, trocar
//    o `context` do RouterProvider sozinho NÃO reavalia o `beforeLoad` de
//    uma rota já casada (o exemplo oficial faz o mesmo na sua função
//    `handleLogout`, ali disparado pelo clique; aqui é uma reação ao
//    próprio `status`, então cobre qualquer caminho de saída, não só um
//    clique específico).
import { useEffect } from 'react'
import {
  Outlet,
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'

import { useAuth } from '@/shared/auth/AuthProvider'
import { AppShell } from './shell/AppShell'
import { BootErrorScreen, BootScreen } from './shell/BootScreen'
import { readLastModule } from './shell/lastModule'
import CategoriasPage from './routes/categorias'
import ConvidarPage from './routes/convidar'
import EntrarPage, { entrarSearchSchema } from './routes/entrar'
import FinanceiroPage from './routes/financeiro'
import TarefasPage from './routes/tarefas'

// O router só monta depois que AppRoot já decidiu que a sessão resolveu
// (nem 'loading' nem 'error' chegam até aqui — ver os returns antecipados
// em AppRoot) — por isso o contexto de auth do router só conhece os dois
// estados definitivos.
type ResolvedAuthStatus = 'signed-in' | 'signed-out'

interface RouterContext {
  auth: { status: ResolvedAuthStatus }
}

function lastModulePath(): '/financeiro' | '/tarefas' {
  return readLastModule() === 'tarefas' ? '/tarefas' : '/financeiro'
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
})

// Rota raiz "/" nunca renderiza nada — só decide para onde redirecionar:
// último módulo visitado se já autenticado, /entrar caso contrário.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => {
    if (context.auth.status === 'signed-in') {
      throw redirect({ to: lastModulePath() })
    }
    throw redirect({ to: '/entrar' })
  },
})

const entrarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/entrar',
  validateSearch: (search: Record<string, unknown>) => entrarSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    // Quem já está autenticado e cai em /entrar (ex.: link de convite já
    // resgatado antes, ou aba antiga) volta direto pro módulo — D-07 não
    // tem tela intermediária.
    if (context.auth.status === 'signed-in') {
      throw redirect({ to: lastModulePath() })
    }
  },
  component: EntrarPage,
})

// Pathless: agrupa as 4 rotas que vivem dentro do AppShell. O gate real de
// autorização continua sendo a Security Rule do Firestore (T-01-15) — este
// beforeLoad é ergonomia de navegação, não a fonte de verdade de acesso.
const authenticatedRoute = createRoute({
  id: '_authenticated',
  getParentRoute: () => rootRoute,
  beforeLoad: ({ context }) => {
    if (context.auth.status === 'signed-out') {
      throw redirect({ to: '/entrar' })
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
})

const financeiroRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/financeiro',
  component: FinanceiroPage,
})

const tarefasRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/tarefas',
  component: TarefasPage,
})

const categoriasRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/categorias',
  component: CategoriasPage,
})

const convidarRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/convidar',
  component: ConvidarPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  entrarRoute,
  authenticatedRoute.addChildren([
    financeiroRoute,
    tarefasRoute,
    categoriasRoute,
    convidarRoute,
  ]),
])

export const router = createRouter({
  routeTree,
  context: {
    // Populado de verdade em AppRoot, sempre com um status já resolvido
    // (nunca 'loading'/'error' — ver os returns antecipados abaixo). O
    // valor aqui só existe para satisfazer o tipo antes do primeiro render.
    auth: undefined as unknown as { status: ResolvedAuthStatus },
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export function AppRoot() {
  const { status } = useAuth()

  useEffect(() => {
    // Ver o comentário de topo do arquivo, item 3 — reavalia o beforeLoad
    // da rota autenticada sempre que o status assentar (signed-in ou
    // signed-out) enquanto o router já está montado.
    if (status === 'signed-in' || status === 'signed-out') {
      void router.invalidate()
    }
  }, [status])

  // UI-SPEC E7/loading — primeiro frame de toda abertura do app.
  if (status === 'loading') {
    return <BootScreen />
  }

  // UI-SPEC E7/error — falha de rede na inicialização, nunca um shell
  // vazio. Recarregar é o "tentar de novo": reinicia getRedirectResult /
  // onAuthStateChanged do zero em vez de tentar reconectar um listener já
  // morto.
  if (status === 'error') {
    return <BootErrorScreen onRetry={() => window.location.reload()} />
  }

  return <RouterProvider router={router} context={{ auth: { status } }} />
}

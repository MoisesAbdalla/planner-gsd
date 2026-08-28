---
phase: 01-acesso-e-espa-o-compartilhado
verified: 2026-08-28T18:18:05Z
status: human_needed
score: 5/5 truths presentes e testados automaticamente; 0 gaps de código; 7 blocos de human-check pendentes (deferidos por human_verify_mode: end-of-phase)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Login real com conta Google (signInWithRedirect) no desktop e no celular, apontando para um projeto Firebase real (não o emulador)"
    expected: "Retorno do redirect cai autenticado sem tela em branco; o nome do espaço aparece na tela vindo do Firestore; existe /workspaces/{id} com o uid em memberIds e /users/{uid}.workspaceId correspondente no console do Firebase; recarregar não restaura sessão após sair"
    why_human: "O emulador de Auth simula o provedor, não o fluxo real de popup/redirect do Google; .env.local só tem placeholders de emulador (VITE_FIREBASE_API_KEY=demo-local-emulator-key, VITE_USE_EMULATORS=true) — nenhum projeto Firebase real foi configurado ainda"
  - test: "Convite de ponta a ponta: gerar o link, mandar por WhatsApp, abrir num segundo aparelho (Android e iPhone), logar com uma segunda conta Google, e confirmar que caiu no mesmo espaço"
    expected: "A segunda conta cai direto no espaço da primeira sem tela de confirmação intermediária; uma categoria criada por uma conta aparece na outra sem recarregar (onSnapshot real); abrir o mesmo link de novo mostra a tela de 'convite já usado'"
    why_human: "Comportamento de navegador embutido do WhatsApp e o fluxo OAuth real não são reproduzíveis no emulador; sincronização entre dois clientes reais abertos ao mesmo tempo não é exercitada por nenhum teste automatizado desta fase (useCategories/useCollection é mockado nos testes de UI, e tests/categories.test.ts roda no projeto 'node', sem montar o hook)"
  - test: "Contraste real renderizado nos dois temas: texto de corpo contra a superfície (alvo 4.5:1) e cada um dos 12 tons de categoria contra o fundo (alvo 3:1), com o SO em modo claro e em modo escuro"
    expected: "Todas as combinações atingem os alvos de contraste do UI-SPEC"
    why_human: "jsdom não computa prefers-color-scheme nem cor renderizada real; exige medição com ferramenta de contraste sobre o app rodando num navegador de verdade"
  - test: "Percorrer todas as telas da fase (entrar, shell financeiro/tarefas, categorias, diálogo de convite) a 320px, 768px e desktop largo, nos dois temas"
    expected: "Nenhuma rolagem horizontal em nenhuma largura; barra inferior não colide com a barra de gestos do iPhone; item ativo da navegação reconhecível em escala de cinza; foco de teclado visível; nome longo de categoria/espaço trunca sem estourar"
    why_human: "Layout CSS real (media queries, overflow, safe-area-inset) não é computado por jsdom; só um navegador real confirma ausência de rolagem horizontal"
  - test: "No console do Firebase, confirmar que uma categoria arquivada continua existindo como documento (só com archivedAt preenchido) depois de arquivada pela interface"
    expected: "O documento sobrevive; nenhum lançamento futuro referenciando essa categoria perde o rótulo"
    why_human: "Exige um projeto Firebase real com dados reais para inspecionar no console — o emulador prova a regra, não a persistência num ambiente de produção real"
  - test: "Reabrir o app depois de um seeding de categorias interrompido no meio (ex.: falha de rede após criar o workspace mas antes de terminar as 12 categorias) e confirmar que as que faltam aparecem"
    expected: "As categorias que faltavam são completadas silenciosamente, sem duplicar as já existentes"
    why_human: "Não existe teste de integração que exercite WorkspaceProvider.resolveAndSubscribe real (não mockado) forçando um seeding parcial — gap de teste registrado em 01-04-SUMMARY.md (coverage.D6), a correção existe por inspeção de código e reaproveita a idempotência já provada de seedDefaultCategories, mas a costura real (reabrir o app) nunca foi exercitada"
  - test: "Diálogo de convite (Dialog desktop / Sheet mobile) a 320px/768px/desktop real: confirmar a troca de superfície e que uma URL de convite longa não estoura o campo nem os botões"
    expected: "Nunca dois modais montados ao mesmo tempo; o campo do link trunca/rola dentro de si mesmo"
    why_human: "useIsDesktop() usa matchMedia, não simulável fielmente em jsdom sem breakpoint real; efeito visual de overflow exige renderização real"
---

# Phase 1: Acesso e espaço compartilhado Verification Report

**Phase Goal:** Duas pessoas conseguem entrar com a conta Google e compartilhar um mesmo espaço de dados, isolado de qualquer outro, com o app já em português e usável no celular
**Verified:** 2026-08-28T18:18:05Z
**Status:** human_needed
**Re-verification:** No — verificação inicial

## Resumo do veredito

**A fase atingiu o que é verificável em código e por teste automatizado — nenhum gap de implementação foi encontrado.** Todos os 6 planos (01-01 a 01-06) entregaram exatamente os artefatos que prometeram, as 129 asserções automatizadas passam contra o Firestore + Auth Emulator reais (não mockado), o build termina com código 0 e o lint só acusa os 3 achados pré-existentes já documentados em `deferred-items.md`.

Isso **não é o mesmo** que "a fase está pronta para uso real". Um bloco grande e conhecido de verificação continua pendente por desenho — `human_verify_mode: end-of-phase` deferiu deliberadamente todo `<human-check>` das seis execuções para o fim da fase, e nenhum projeto Firebase real existe ainda (`.env.local` só tem placeholders de emulador `demo-local-emulator-key`/`VITE_USE_EMULATORS=true`). O login Google real, a sincronização em tempo real entre dois navegadores de verdade, o contraste renderizado e a ausência de rolagem horizontal em tela real **nunca foram observados** — só a forma do código que deveria produzi-los. Por isso o status é `human_needed`, não `passed`: a lista completa está na seção Human Verification abaixo e no frontmatter.

## Goal Achievement

### Observable Truths

| # | Truth (Success Criteria do ROADMAP) | Status | Evidência |
|---|---|---|---|
| 1 | Usuário entra com Google e cai num espaço criado para ele sem cadastro, e sai de qualquer tela | ⚠️ Código+teste verde / OAuth real não observado | `bootstrapNewWorkspace` idempotente provado em `tests/bootstrap.test.ts` (18/18); `AvatarMenu.tsx` expõe "Sair da conta" com diálogo de confirmação (D-22) em `tests/shell.test.tsx`; `signIn.ts` usa `signInWithRedirect`. **Mas** nenhum login Google real foi executado — `.env.local` só tem placeholders de emulador; human-check pendente |
| 2 | Convite por link, segunda pessoa entra, os dois veem as mesmas categorias em tempo real | ⚠️ Código+teste verde / tempo real cross-browser não observado | `firestore.rules` prova a posse do token em 3 variantes negadas (`tests/firestore.rules.test.ts:427-457`, ver detalhe abaixo); `joinWorkspace` com `runTransaction`+`tx.get()` provado com resgate concorrente (`tests/invite.test.ts`); `useCategories` usa `useCollection` (wrapper de `onSnapshot`) — mecanismo de tempo real presente e wired. **Mas** nunca foi exercitado com dois navegadores reais; human-check pendente |
| 3 | Usuário de um espaço não lê nem grava nada de outro, verificado com dois espaços de verdade | ✓ VERIFIED | `tests/firestore.rules.test.ts:142-167` cria `wsA` e `wsB` como documentos reais no emulador (não um só) e prova `bob` (membro só de `wsB`) `assertFails` na leitura de `workspaces/wsA` e de `workspaces/wsA/categories/mercado`, e na criação de uma categoria em `wsA`. A falha mais perigosa (usuário autenticado que nunca viu o link) é provada negada em exatamente as 3 variantes pedidas: sem `joinToken` (linha 427), com token chutado (437), com token válido de **outro** workspace (448) — todas usando `assertFails` real contra o emulador, com `wsA` e `wsB` genuinamente criados. Esta é a truth mais forte da fase |
| 4 | Categorias padrão em pt-BR no primeiro acesso; criar/renomear/mudar cor/arquivar sem perder lançamentos | ✓ VERIFIED | Seeding idempotente provado (`tests/categories.test.ts`: contagem, nomes, ids, cores, idempotência, retomada, concorrência — 8 casos); regra de `firestore.rules:83-105` nega `delete` sempre e trava "Outros nunca arquiva" comparando `resource.data.canArchive` (não o payload); `ArchiveCategoryDialog`/`CategoryFormDialog` com React Hook Form + Zod, sem exclusão em nenhum componente (`tests/categories-ui.test.tsx`, 30 casos) |
| 5 | Toda tela funciona no celular e desktop sem rolagem horizontal, pt-BR, R$ | ⚠️ Parcial — pt-BR/R$ verificados; layout real não observado | pt-BR confirmado em todas as cópias visíveis (grep nos componentes, cópias exatas do UI-SPEC testadas em `tests/invite-ui.test.tsx`/`tests/categories-ui.test.tsx`); `formatCents`/`Intl.NumberFormat('pt-BR', {currency:'BRL'})` testado em `tests/money.test.ts`; `AppShell` troca de superfície em 768px (`grep -c "768"` = 2). **Mas** ausência de rolagem horizontal a 320px/768px/desktop e contraste 4.5:1/3:1 são propriedades de layout CSS real que jsdom não computa — nunca medidas num navegador de verdade; human-check pendente |

**Score:** 5/5 truths com evidência automatizada positiva e sem nenhum gap de implementação encontrado; 3 delas (#1, #2, #5) têm uma parcela de comportamento real (OAuth, sincronização cross-browser, layout renderizado) que só um humano pode confirmar e que nunca foi exercitada nesta fase.

### Requisitos (13 — AUTH-01..07, CAT-01..04, PLAT-01, PLAT-02)

| Requisito | Evidência automatizada | Status |
|---|---|---|
| AUTH-01 (entrar com Google) | `bootstrapNewWorkspace` idempotente, `signInWithGoogle` presente | Código completo; login real pendente (human-check) |
| AUTH-02 (sair da conta) | `AvatarMenu` "Sair da conta" + diálogo de confirmação testado | ✓ Automatizado |
| AUTH-03 (espaço criado no primeiro login) | `tests/bootstrap.test.ts` prova criação + idempotência | ✓ Automatizado |
| AUTH-04 (gerar convite) | `createInvite` — token `crypto.randomUUID()`, TTL 7d, testado em `tests/invite.test.ts` | ✓ Automatizado |
| AUTH-05 (entrar por convite) | `joinWorkspace` transacional + regra com prova de posse do token, 3 variantes negadas | ✓ Automatizado (E2E cross-browser pendente) |
| AUTH-06 (mesmos dados em tempo real) | `useCategories`/`onSnapshot` wired; query idêntica testada isoladamente | Mecanismo presente; tempo real cross-browser pendente (human-check) |
| AUTH-07 (isolamento) | `tests/firestore.rules.test.ts` com dois workspaces reais, múltiplos casos | ✓ Automatizado — mais forte da fase |
| CAT-01 (12 categorias padrão) | Seeding idempotente testado (8 casos) | ✓ Automatizado |
| CAT-02 (criar categoria) | `createCategory` + `CategoryFormDialog` testados | ✓ Automatizado |
| CAT-03 (editar nome/cor) | `updateCategory` testado, duplicidade ignora a própria em edição | ✓ Automatizado |
| CAT-04 (arquivar preserva histórico) | `delete` sempre negado por regra; `archivedAt` em vez de exclusão; testado | ✓ Automatizado |
| PLAT-01 (pt-BR, R$) | Cópias exatas testadas; `formatCents` testado | ✓ Automatizado |
| PLAT-02 (responsivo sem rolagem horizontal) | Breakpoint 768px no código; ausência de rolagem real não medida | Código presente; medição real pendente (human-check) |

Nenhum requisito órfão — os 13 aparecem em algum plano da fase e todos têm pelo menos evidência de código+teste unitário/regra.

### Required Artifacts (amostra — todos os `must_haves.artifacts` dos 6 planos foram lidos e existem no disco)

| Artifact | Expected | Status |
|---|---|---|
| `firestore.rules` | `isMember()`, `/users`, `/workspaces`, `/invites/{token}`, `/categories/{categoryId}` | ✓ VERIFIED — lido integralmente, bate com todas as descrições dos SUMMARYs |
| `src/shared/workspace/bootstrap.ts` | Bootstrap idempotente + seeding | ✓ VERIFIED |
| `src/features/invite/join.ts` | `runTransaction` + `tx.get()`, nunca `writeBatch` | ✓ VERIFIED — `grep` confirma ausência de `writeBatch` |
| `src/modules/categories/hooks/useCategories.ts` | Listener `onSnapshot`-based (via `useCollection`) | ✓ VERIFIED — lido, confirma `useCollection` real |
| `src/app/routes/categorias.tsx` | Tela real (não mais stub) | ✓ VERIFIED — renderiza `<CategoryList />`, sem placeholder |
| `.env.local` | Credenciais reais do Firebase | ✗ AUSENTE — só placeholders de emulador; pendência explícita e documentada |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `src/features/invite/join.ts` | `firestore.rules` (`/workspaces` update) | `joinToken` no payload → `get()` na regra | ✓ WIRED — provado com 3 variantes negadas |
| `src/modules/categories/components/CategoryList.tsx` | `useCategories` → Firestore | `useCollection(query(...))` | ✓ WIRED — dado flui da query real, não estático |
| `src/app/routes/categorias.tsx` | `CategoryList` | import direto, sem stub | ✓ WIRED |
| `WorkspaceProvider.tsx` | `/workspaces/{id}` e `/users/{uid}` | `onSnapshot` duplo (workspace normal + resgate de convite pendente) | ✓ WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Suíte completa contra o emulador real (não mock) | `npm run test:all` | 129 passed (129), 9 arquivos, 15.4s | ✓ PASS |
| Build de produção | `npm run build` | `tsc -b && vite build`, código 0, `dist/index.html` gerado | ✓ PASS |
| Lint | `npm run lint` | 3 erros — todos os 3 já documentados em `deferred-items.md` como pré-existentes, nenhum introduzido por esta fase | ✓ PASS (dentro do esperado) |
| Caso mais perigoso do convite (3 variantes) | leitura direta de `tests/firestore.rules.test.ts:427-458` | `assertFails` real, `wsA`/`wsB` genuinamente criados | ✓ PASS |
| Isolamento com dois espaços reais | leitura direta de `tests/firestore.rules.test.ts:142-167` | `assertFails`/`assertSucceeds` reais | ✓ PASS |

### Anti-Patterns Found

Nenhum. Busca por `TBD`/`FIXME`/`XXX` em `src/`, `tests/`, `firestore.rules`: zero ocorrências. Busca por `TODO`/`HACK`/"placeholder"/"not yet implemented": zero ocorrências relevantes (só o atributo HTML `placeholder:` de estilo e comentários descritivos legítimos). `src/app/routes/financeiro.tsx` e `tarefas.tsx` renderizam só o título do módulo — **não é stub no sentido de atalho tomado**, é escopo explícito da fase (`01-CONTEXT.md`: "Não cobre... qualquer lançamento financeiro... Esta fase entrega acesso, isolamento e o shell visual"); conteúdo real chega nas Fases 2 e 6.

## Itens conhecidos e deliberadamente adiados (não são falhas)

Conforme `human_verify_mode: end-of-phase`, os seguintes `<human-check>` foram registrados em cada plano e nunca executados nesta verificação — listados integralmente no frontmatter `human_verification` acima:

1. Login Google real (desktop + celular) — sem projeto Firebase real configurado ainda
2. Ciclo completo de convite por WhatsApp entre duas contas reais (Android + iPhone) e a sincronização de categorias em tempo real entre dois navegadores
3. Contraste renderizado real nos dois temas (4.5:1 texto, 3:1 categorias)
4. Ausência de rolagem horizontal a 320px/768px/desktop, nos dois temas
5. Confirmação visual no console do Firebase de que uma categoria arquivada sobrevive como documento
6. Resumo de seeding parcial ao reabrir o app com um workspace já existente — corrigido por inspeção de código (`WorkspaceProvider.tsx`), mas sem teste de integração que force o cenário real (gap registrado pelo próprio 01-04-SUMMARY.md)
7. Diálogo/Sheet de convite em breakpoints reais com URL longa

Nenhum desses é uma lacuna de implementação — o mecanismo de código existe e está testado no nível que dá para testar sem um navegador/projeto Firebase reais. São exatamente os itens que `01-VALIDATION.md` já havia classificado como `manual`/`backstop` desde o planejamento.

## Human Verification Required

Ver a lista completa e estruturada no frontmatter `human_verification` (7 itens). Recomenda-se rodar a checagem de fim de fase com um projeto Firebase real configurado (`.env.local` preenchido com credenciais reais, `VITE_USE_EMULATORS=false`) antes de considerar a Fase 1 pronta para a Fase 2.

---

_Verified: 2026-08-28T18:18:05Z_
_Verifier: Claude (gsd-verifier)_

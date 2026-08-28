---
phase: 01-acesso-e-espa-o-compartilhado
plan: 05
subsystem: ui
tags: [invite-link, whatsapp-share, tanstack-router, sonner, clipboard-api, session-storage, react-firebase-hooks]

# Dependency graph
requires:
  - phase: 01-02
    provides: "src/features/invite/data/invites.ts (createInvite/inviteRef/inviteUrl/INVITE_TTL_DAYS) e src/features/invite/join.ts (joinWorkspace/JoinInviteError/JoinInviteErrorCode) — contrato consumido sem mudar assinatura"
  - phase: 01-03
    provides: "src/shared/ui/{dialog,sheet,button,input,label,sonner}.tsx, src/app/router.tsx (entrarSearchSchema, rota /convidar), src/app/shell/lastModule.ts"
provides:
  - "src/features/invite/components/InviteDialog.tsx — diálogo/sheet responsivo que gera o link em um toque, WhatsApp como CTA primário, copiar como secundário"
  - "src/features/invite/components/JoinInviteScreen.tsx — orquestra joinWorkspace após autenticação, sucesso cai direto no Financeiro"
  - "src/features/invite/components/InviteErrorScreen.tsx — as três telas cheias de falha com a cópia exata do UI-SPEC"
  - "src/features/invite/pendingToken.ts — sessionStorage compartilhado entre entrar.tsx e WorkspaceProvider.tsx para o token sobreviver ao redirect do Google"
  - "src/app/routes/convidar.tsx e entrar.tsx com o fluxo de convite real (substituindo os stubs do plano 01-03)"
  - "WorkspaceProvider.tsx inibe bootstrapNewWorkspace enquanto há um convite pendente de resgate (D-07), assinando /users/{uid} reativamente até o resgate escrever o workspaceId real"
affects: ["01-06 (categorias) — nenhum contrato mudou; fim da fase 01, human-checks de ponta a ponta"]

# Actuals (#2632)
actuals:
  tokens: 9450
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Breakpoint de Dialog/Sheet resolvido uma única vez por matchMedia (não por CSS hidden/visible) — evita dois modais Radix montados e competindo por foco ao mesmo tempo; padrão específico para diálogos responsivos, distinto do CSS puro usado por BottomNav/SideRail (que não são modais)"
    - "Token do convite preservado através do redirect do Google via sessionStorage dedicado (src/features/invite/pendingToken.ts), lido como fallback quando o search param `convite` não sobrevive à ida-e-volta completa até accounts.google.com; apagado por JoinInviteScreen assim que o resgate resolve (sucesso ou falha)"
    - "WorkspaceProvider passa a ter três ramos de resolução (não dois): workspace existente (subscribe direto), convite pendente (assina /users/{uid} reativamente, nunca bootstrap), e nenhum dos dois (bootstrap). A checagem de convite pendente é síncrona (sessionStorage) e acontece ANTES de qualquer chamada a bootstrapNewWorkspace — é essa ordem, não uma flag de estado, que garante D-07"
    - "userEvent.setup() do @testing-library/user-event instala seu próprio stub de Clipboard em navigator.clipboard (substitui qualquer atribuição feita antes) — testar clipboard requer `vi.spyOn(navigator.clipboard, 'writeText')` DEPOIS do setup(), nunca um mock atribuído via Object.defineProperty antes dele"

key-files:
  created:
    - src/features/invite/components/InviteDialog.tsx
    - src/features/invite/components/JoinInviteScreen.tsx
    - src/features/invite/components/InviteErrorScreen.tsx
    - src/features/invite/pendingToken.ts
    - tests/invite-ui.test.tsx
  modified:
    - src/app/routes/convidar.tsx
    - src/app/routes/entrar.tsx
    - src/shared/workspace/WorkspaceProvider.tsx

key-decisions:
  - "Dialog (desktop) vs Sheet (mobile) resolvido por um hook useIsDesktop() (matchMedia), não por duas árvores CSS hidden/visible como o resto do shell — só um Radix Dialog root pode estar aberto de cada vez sem conflito de foco/aria-modal; sem window.matchMedia (ex.: ambiente de teste sem polyfill), o hook cai para false (Sheet), o que não afeta os testes de comportamento porque Dialog e Sheet compartilham a mesma primitiva Radix por baixo (role=\"dialog\" em ambos)"
  - "WhatsApp aberto via window.open(wa.me/?text=...) em vez de <a> ancorado — mantém o mesmo botão desabilitado/habilitado que o de copiar, sem precisar simular disabled em um <a> (que HTML não suporta nativamente)"
  - "invite-not-found funde com a variante de convite expirado em InviteErrorScreen (decisão já prevista no plano) — distinguir os dois confirmaria a existência de um token para quem está tentando adivinhar (T-01-21)"
  - "src/features/invite/pendingToken.ts criado fora do files_modified literal do plano — necessário porque entrar.tsx (árvore app/routes) e WorkspaceProvider.tsx (árvore shared/workspace) precisam do mesmo sinal síncrono de \"há um resgate pendente?\" sem se importarem um do outro; vive em features/invite/ (já dona do domínio de convite) em vez de forçar a dependência numa direção ou na outra. Documentado como deviation (Rule 2) abaixo"
  - "WorkspaceProvider ganhou um terceiro ramo reativo (assinar /users/{uid} via onSnapshot) em vez de um polling ou de um event bus customizado para retomar a resolução depois que joinWorkspace escreve o workspaceId — reaproveita o mesmo padrão onSnapshot já usado para /workspaces/{id}, sem introduzir um mecanismo novo"

patterns-established:
  - "Ver tech-stack.patterns acima"

requirements-completed: [AUTH-04, AUTH-05, PLAT-01, PLAT-02]

coverage:
  - id: D1
    description: "InviteDialog gera o link em um toque (createInvite ao montar), WhatsApp como CTA primário (wa.me com o link preenchido), Copiar link como secundário (clipboard + toast), nota '7 dias, uso único' — loading (spinner no lugar do campo, botões desabilitados) e error (toast global com retry que chama createInvite de novo)"
    requirement: "AUTH-04"
    verification:
      - kind: unit
        ref: "tests/invite-ui.test.tsx > InviteDialog (Screen 3, E2, AUTH-04, D-01) — 6 casos (loading, valor resolvido, cópias exatas, copiar+toast, erro+retry, nunca mostra nome/membros do espaço)"
        status: pass
      - kind: unit
        ref: "command: grep -c 'Compartilhar no WhatsApp'/'Copiar link'/'Link copiado!'/'wa.me'/'createInvite' src/features/invite/components/InviteDialog.tsx (Task 1 <acceptance_criteria>)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Diálogo centralizado em >=768px e bottom sheet em <768px de fato trocam de superfície no navegador real; o campo somente-leitura do link trunca/rola dentro de si mesmo sem estourar o diálogo nem provocar rolagem horizontal na página com uma URL longa (E2/overflow, E2/long-text, PLAT-02)"
    verification: []
    human_judgment: true
    rationale: "jsdom não computa media queries nem layout CSS real — o hook useIsDesktop() e o input nativo readOnly foram implementados para satisfazer isso, mas a prova visual exige um navegador real a 320px/768px, deferida para o <human-check> de fim de fase (human_verify_mode: end-of-phase) junto com os pendentes já registrados em 01-03-SUMMARY.md"
  - id: D3
    description: "Quem abre o link sem sessão passa pela MESMA tela de entrar (não uma variante própria); com sessão, JoinInviteScreen chama joinWorkspace uma única vez, mostra spinner em tela cheia (E3/loading) e, no sucesso, cai direto no Financeiro sem tela de confirmação intermediária"
    requirement: "AUTH-05"
    verification:
      - kind: unit
        ref: "tests/invite-ui.test.tsx > JoinInviteScreen (Screen 4, E3, AUTH-05, D-07) — loading, navega para /financeiro sem confirmação, chamado exatamente uma vez mesmo com múltiplas renderizações"
        status: pass
      - kind: unit
        ref: "command: grep -c 'joinWorkspace' src/features/invite/components/JoinInviteScreen.tsx (Task 2 <acceptance_criteria>)"
        status: pass
    human_judgment: false
  - id: D4
    description: "As três telas cheias de falha (convite expirado, já usado, já pertence a outro espaço) usam a cópia EXATA do UI-SPEC Copywriting Contract; invite-not-found funde com convite expirado (privacidade, T-01-21); um único botão de ação volta para /entrar sem o parâmetro de convite; nenhuma tela nomeia o espaço, mostra id ou token completo"
    requirement: "PLAT-01"
    verification:
      - kind: unit
        ref: "tests/invite-ui.test.tsx > InviteErrorScreen (Copywriting Contract, T-01-21) — 5 casos (as 3 cópias exatas, único botão levando a /entrar, nunca vaza id/token do espaço) + JoinInviteScreen > 4 casos de rejeição, um por JoinInviteErrorCode"
        status: pass
      - kind: unit
        ref: "command: grep -c das 3 cópias de título em src/features/invite/components/InviteErrorScreen.tsx (Task 2 <acceptance_criteria>)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Quem chega por convite nunca ganha um espaço novo — com um token pendente de resgate, WorkspaceProvider nunca chama bootstrapNewWorkspace, assina /users/{uid} reativamente e só passa a assinar o workspace real quando joinWorkspace escreve o workspaceId (D-07)"
    requirement: "AUTH-05"
    verification:
      - kind: unit
        ref: "tests/invite-ui.test.tsx > WorkspaceProvider inibe bootstrap enquanto há convite pendente (D-07) — 2 casos: bootstrap nunca chamado com token pendente; assina o workspace real reativamente assim que /users/{uid}.workspaceId aparece, sem nunca ter chamado bootstrap"
        status: pass
    human_judgment: false
  - id: D6
    description: "Token sobrevive ao redirect real do Google (signInWithRedirect -> accounts.google.com -> volta), inclusive quando o WhatsApp abre o link num navegador embutido de app de mensagem em Android/iPhone (01-RESEARCH.md Open Question 3)"
    verification: []
    human_judgment: true
    rationale: "A mecânica (sessionStorage gravado antes do redirect, lido de volta e apagado após o desfecho) está implementada e coberta indiretamente pelos testes de unidade de WorkspaceProvider/JoinInviteScreen, mas o ciclo real de duas contas Google com o link vindo do WhatsApp em Android e iPhone só pode ser medido com aparelhos e contas reais — <human-check> da Task 2, deferido para o fim da fase (T-01-22, disposição 'accept' no threat_model do plano)"

duration: "~30min"
completed: 2026-08-28
status: complete
---

# Phase 1 Plan 5: Acesso e espaço compartilhado — o convite na tela Summary

**Diálogo/Sheet responsivo de convite (link em um toque, WhatsApp como CTA primário via `wa.me`, `Copiar link` secundário), resgate automático pós-login em `JoinInviteScreen` (sem tela de confirmação), três telas cheias de falha com a cópia exata do UI-SPEC, e `WorkspaceProvider` estendido para nunca criar um espaço próprio enquanto há um convite pendente de resgate.**

## Performance

- **Duration:** ~30min
- **Completed:** 2026-08-28
- **Tasks:** 2 (Task 1: diálogo de convidar; Task 2: entrada por link + três telas de falha)
- **Files modified:** 8 (5 criados, 3 modificados)

## Accomplishments

- `InviteDialog.tsx`: gera o convite ao montar (`createInvite`), campo somente-leitura com `inviteUrl(token)`, botão primário `Compartilhar no WhatsApp` (abre `wa.me` com o link e uma frase informal em pt-BR), botão secundário `Copiar link` (clipboard + toast `Link copiado!`), nota `Válido por 7 dias, uso único.` — loading com spinner no lugar do campo e botões desabilitados, erro com o toast global de falha ao salvar e retry
- Escolha entre `Dialog` (>=768px) e `Sheet` (<768px) resolvida uma única vez por `matchMedia`, nunca os dois modais Radix montados ao mesmo tempo
- `entrar.tsx` estendido: o parâmetro `convite` decide entre a MESMA tela de entrar de sempre (sem sessão) e `JoinInviteScreen` (com sessão) — o token é gravado em `sessionStorage` (`src/features/invite/pendingToken.ts`) antes de `signInWithGoogle()` para sobreviver ao redirect, e apagado assim que o resgate resolve
- `JoinInviteScreen.tsx`: chama `joinWorkspace(token, uid)` uma única vez (guarda contra o duplo-efeito do StrictMode), spinner em tela cheia enquanto resolve, sucesso navega direto para `/financeiro` sem tela de confirmação
- `InviteErrorScreen.tsx`: as três telas cheias com a cópia EXATA do UI-SPEC (convite expirado, já usado, já pertence a outro espaço) — `invite-not-found` funde com convite expirado por privacidade (T-01-21) — um único botão volta para `/entrar` sem o parâmetro
- `WorkspaceProvider.tsx`: ganhou um terceiro ramo — com um token de convite pendente, nunca chama `bootstrapNewWorkspace`; assina `/users/{uid}` reativamente e só passa a assinar o workspace real quando o resgate escreve o `workspaceId` (D-07)
- 20 casos novos em `tests/invite-ui.test.tsx` cobrindo os dois componentes de tela, as três variantes de erro e a inibição de bootstrap — `npm run test:all` 99/99 verde (79 baseline + 20), `npm run build` código 0

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Diálogo Convidar alguém — gerar o link e mandar no WhatsApp** - `52f0d3f` (feat)
2. **Task 2: Entrada pelo link — resgate depois do login e as três telas de falha** - `0f896d4` (feat)

**Plan metadata:** _(commit final de docs desta execução, ver abaixo)_

## Files Created/Modified

- `src/features/invite/components/InviteDialog.tsx` - diálogo/sheet de convidar (Task 1)
- `src/app/routes/convidar.tsx` - rota real, substitui o stub de 01-03 (Task 1)
- `src/features/invite/components/JoinInviteScreen.tsx` - orquestração do resgate (Task 2)
- `src/features/invite/components/InviteErrorScreen.tsx` - as três telas de falha (Task 2)
- `src/features/invite/pendingToken.ts` - sessionStorage compartilhado (Task 2, ver Deviations)
- `src/app/routes/entrar.tsx` - ramo de resgate por convite (Task 2)
- `src/shared/workspace/WorkspaceProvider.tsx` - inibe bootstrap com convite pendente (Task 2)
- `tests/invite-ui.test.tsx` - 20 casos cobrindo Task 1 e Task 2

## Decisions Made

Ver `key-decisions` no frontmatter — resumo:

- Dialog/Sheet resolvidos por `matchMedia` (hook `useIsDesktop`), não por CSS `hidden`/`visible` — evita dois modais Radix competindo por foco
- WhatsApp aberto via `window.open`, não `<a>` ancorado — mantém o mesmo padrão de `disabled` dos dois botões
- `invite-not-found` funde com a variante de convite expirado (decisão já prevista no plano, T-01-21)
- `pendingToken.ts` criado como módulo compartilhado fora da árvore de `entrar.tsx`/`WorkspaceProvider.tsx` — ver Deviations
- `WorkspaceProvider` retoma a resolução via um terceiro ramo reativo (`onSnapshot` em `/users/{uid}`), reaproveitando o mesmo padrão já usado para `/workspaces/{id}`, em vez de polling ou de um event bus customizado

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] `src/features/invite/pendingToken.ts` criado fora do `files_modified` literal do plano**

- **Found during:** Task 2, ao desenhar como o token sobrevive ao redirect do Google e como `WorkspaceProvider` sabe que há um resgate pendente
- **Issue:** O plano explicitamente exige as duas coisas ("o token precisa sobreviver ao redirect... a critério do executor" e "coordene isso com o `WorkspaceProvider`"), mas `entrar.tsx` (árvore `app/routes/`) e `WorkspaceProvider.tsx` (árvore `shared/workspace/`) não tinham um lugar comum para esse sinal síncrono sem forçar uma dependência de uma árvore sobre a outra
- **Fix:** Módulo dedicado `src/features/invite/pendingToken.ts` (`readPendingInviteToken`/`writePendingInviteToken`/`clearPendingInviteToken` sobre `sessionStorage`), importado por ambos — vive em `features/invite/` porque já é o dono do domínio de convite
- **Files modified:** `src/features/invite/pendingToken.ts` (novo), `src/app/routes/entrar.tsx`, `src/shared/workspace/WorkspaceProvider.tsx`
- **Verification:** `tests/invite-ui.test.tsx > WorkspaceProvider inibe bootstrap...` (2 casos) + `npm run test:all` 99/99
- **Committed in:** `0f896d4` (Task 2)

**2. [Rule 1 - Bug] Teste de "Copiar link" falhava por conflito com o stub de Clipboard do `@testing-library/user-event`**

- **Found during:** Task 1, primeira execução de `npx vitest run tests/invite-ui.test.tsx` — `clipboardWriteTextMock` nunca era chamado
- **Issue:** `userEvent.setup()` instala seu próprio stub em `navigator.clipboard` (`Clipboard.attachClipboardStubToView`), substituindo qualquer valor atribuído antes via `Object.defineProperty` — o mock do teste nunca era de fato usado pelo componente
- **Fix:** `vi.spyOn(navigator.clipboard, 'writeText')` criado DEPOIS de `userEvent.setup()`, sobre o mesmo stub que o `user-event` instala
- **Files modified:** `tests/invite-ui.test.tsx`
- **Verification:** `npx vitest run tests/invite-ui.test.tsx` — 20/20 verde
- **Committed in:** `0f896d4` (Task 2, commit único que inclui o arquivo de teste completo — ver nota abaixo sobre granularidade do commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug de teste)
**Impact on plan:** Nenhuma mudança de desenho central do plano — a #1 é infraestrutura de coordenação exigida pelo próprio texto do plano, sem contrato novo exposto para fora da fase; a #2 é um ajuste de mecânica de teste, sem afetar o comportamento de produção verificado.

## Issues Encountered

- **Granularidade dos commits de task**: o plano lista `tests/invite-ui.test.tsx` entre os arquivos de AMBAS as tasks (é um único arquivo compartilhado, não um por task). Como os testes de `JoinInviteScreen`/`InviteErrorScreen` (Task 2) são importados no topo do mesmo arquivo que os testes de `InviteDialog` (Task 1), o arquivo só compila com os componentes das duas tasks já existindo. O commit da Task 1 (`52f0d3f`) contém só a produção de código da Task 1 (`InviteDialog.tsx`, `convidar.tsx`); o arquivo de teste completo (cobrindo as duas tasks) foi commitado junto da Task 2 (`0f896d4`), já que não pode existir em forma parcial e passar. Nenhuma criação de espaço adicional para "arrumar" isso: a Task 1 foi verificada integralmente (build + os 6 casos de `InviteDialog`) antes do commit, só o COMMIT do arquivo de teste ficou agrupado com a Task 2.

## User Setup Required

None diretamente — os pendentes já registrados em 01-01-SUMMARY.md/01-03-SUMMARY.md (projeto Firebase real com Google habilitado, `.env.local` com credenciais reais) continuam valendo para os `<human-check>` desta task também.

## Known Stubs

Nenhum. Todas as telas desta execução (`InviteDialog`, `JoinInviteScreen`, `InviteErrorScreen`) são implementações reais, sem dado mockado ou hardcoded — `InviteDialog` lê `useWorkspace()`/`useAuth()` reais e chama `createInvite` real; `JoinInviteScreen` chama `joinWorkspace` real; nenhuma delas usa um valor de placeholder além da cópia estática já especificada no UI-SPEC.

## Next Phase Readiness

- Todos os `<interfaces>` consumidos (`createInvite`, `inviteUrl`, `joinWorkspace`, `JoinInviteError`) foram usados exatamente como o plano 01-02 os expôs, sem mudança de assinatura
- `src/app/router.tsx`, `AppShell.tsx` e `AvatarMenu.tsx` não precisaram de nenhuma alteração — os pontos de substituição (`convidar.tsx`, `entrar.tsx`) já estavam preparados pelo plano 01-03
- **Human-checks pendentes (deferidos para o fim da fase, `human_verify_mode: end-of-phase`)**, acumulando aos já registrados em 01-01/01-03/01-04-SUMMARY.md:
  1. Diálogo/Sheet reais a 320px/768px/desktop: confirmar a troca de superfície, ausência de rolagem horizontal, e que uma URL de convite longa não estoura o campo nem os botões (D2 da tabela `coverage` acima)
  2. Ciclo real de duas contas Google com o link mandado por WhatsApp em Android e em iPhone — medir se o navegador embutido do WhatsApp aceita o OAuth do Google (Open Question 3 de 01-RESEARCH.md, T-01-22 aceito como risco); confirmar que a conta B cai direto no espaço da conta A, que uma categoria criada na conta A aparece em tempo real na conta B (AUTH-06), e que abrir o mesmo link de novo mostra a tela de "convite já usado" (D6 da tabela `coverage` acima)
  3. Percorrer as três telas de falha em navegador real a 320px
- Nenhum bloqueio para o plano 01-06 (categorias, já implementado no 01-04 do lado de dados) — este plano fecha a Fase 1 do lado de acesso/convite; falta só o UI de categorias (`src/app/routes/categorias.tsx`, ainda um stub) e os human-checks acumulados acima

---
*Phase: 01-acesso-e-espa-o-compartilhado*
*Completed: 2026-08-28*

## Self-Check: PASSED

Todos os 9 arquivos citados (InviteDialog.tsx, JoinInviteScreen.tsx, InviteErrorScreen.tsx, pendingToken.ts, tests/invite-ui.test.tsx, convidar.tsx, entrar.tsx, WorkspaceProvider.tsx, este SUMMARY) confirmados presentes no disco (`[ -f ]`), e os dois commits de task (`52f0d3f`, `0f896d4`) confirmados presentes em `git log --oneline --all`. Acceptance criteria de ambas as tasks re-verificados nesta sessão com os comandos exatos do PLAN.md — todos PASS: `npm run build` (código 0), `npx vitest run tests/invite-ui.test.tsx` (20/20), `npm run test:all` (99/99), e os 9 comandos `grep` de verificação literal das duas tasks.

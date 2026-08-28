---
phase: 01-acesso-e-espa-o-compartilhado
plan: 01
subsystem: auth
tags: [firebase, firestore, security-rules, firebase-auth, google-oauth, vite, react, vitest, rules-unit-testing]

# Dependency graph
requires: []
provides:
  - "Projeto Vite/React/TS scaffolded, com Firebase Emulator Suite configurado (Firestore 8080, Auth 9099)"
  - "firestore.rules real: isMember(wsId), /users/{uid} e /workspaces/{workspaceId} — memberIds: string[] como modelo de membership"
  - "Fluxo de primeiro login: signInWithGoogle (redirect) -> bootstrapNewWorkspace (idempotente) -> useWorkspace() (onSnapshot)"
  - "Convenções D-23 (centavos), D-24 (fuso America/Sao_Paulo), D-25 (workspaceId no path) fixadas em código com teste"
  - "Harness de teste de regras (tests/rules-harness.ts) e padrão de mock de src/shared/firebase/client.ts para testar funções que usam o db singleton contra uids específicos no emulador"
affects: ["01-02", "01-03", "01-04", "01-05", "01-06"]

# Actuals (#2632)
actuals:
  tokens: 141020
  tasks: 2
  commits: 3

tech-stack:
  added: ["firebase 12.18.0", "firebase-tools 15.28.2", "@firebase/rules-unit-testing 5.0.2", "vitest 4.1.11", "date-fns 4.4.0", "@date-fns/tz 1.5.0", "dinero.js 2.0.2", "@tanstack/react-router 1.170.32 (instalado, não usado ainda)"]
  patterns:
    - "isMember(wsId) como função única de isolamento por workspace nas Security Rules — get() no doc pai, testando request.auth.uid in memberIds"
    - "bootstrap.ts: resolveUserWorkspace + bootstrapNewWorkspace com early-return por idempotência (nunca dois writeBatch para o mesmo uid)"
    - "AuthProvider/WorkspaceProvider: contexto React com status discreto ('loading'|'signed-out'|'signed-in' / 'loading'|'none'|'ready'), nunca boolean solto"
    - "Testes contra o emulador que precisam de uma Security Rule avaliada com um uid específico mockam o `db` de src/shared/firebase/client.ts via vi.mock com getter, trocando o valor em runtime para testEnv.authenticatedContext(uid).firestore() — preserva a assinatura pública (uid: string) das funções de produção"
    - "Arquivos de teste que batem no Firestore Emulator com o mesmo projectId precisam de fileParallelism: false (vitest.config.ts, projeto 'node') — rodar em paralelo corrompe o estado compartilhado"

key-files:
  created:
    - src/shared/firebase/client.ts
    - src/shared/auth/signIn.ts
    - src/shared/auth/AuthProvider.tsx
    - src/shared/workspace/bootstrap.ts
    - src/shared/workspace/WorkspaceProvider.tsx
    - src/shared/money.ts
    - src/shared/date.ts
    - tests/rules-harness.ts
    - tests/firestore.rules.test.ts
    - tests/bootstrap.test.ts
    - tests/money.test.ts
    - tests/date.test.ts
    - firestore.rules
    - firebase.json
    - firestore.indexes.json
  modified:
    - src/App.tsx
    - vitest.config.ts

key-decisions:
  - "Checkpoint da Task 2 resolvido pelo usuário: memberIds: string[] no documento /workspaces/{workspaceId} (não subcoleção /members/{uid}) — decisão de sentido único, herdada por toda Security Rule das fases 2-6"
  - "typescript pinado em 6.0.2 (não 7.0.2 de STACK.md): typescript-eslint@8.68.0 exige typescript <6.1.0, 7.0.2 quebra npm install com ERESOLVE"
  - "formatCents normaliza o espaço não separável (U+00A0) que Intl.NumberFormat('pt-BR') insere para um espaço comum, evitando bugs de comparação/grep por caractere invisível"
  - "vitest.config.ts usa a API test.projects do Vitest 4 (environmentMatchGlobs foi removida)"
  - "vitest.config.ts: fileParallelism: false no projeto 'node' — bootstrap.test.ts e firestore.rules.test.ts (e os que virão nos planos seguintes) batem no mesmo projectId Firestore ('cotidiano-test'); rodar em paralelo causava falhas não-determinísticas (list com 'Property X is undefined', contagens erradas) por corrida entre clearFirestore()/escritas de um arquivo e leituras de outro"
  - "D-20 (apiKey pública por design): registrada em .env.local.example e reforçada em comentário no client.ts — quem protege os dados são as Security Rules, não a apiKey"
  - "D-21 (conflito de escrita simultânea é last-write-wins, aceito conscientemente): nenhuma lógica de merge/CRDT foi implementada; o Firestore resolve por ordem de chegada da escrita, e isso é intencional para um app de duas pessoas"
  - "D-22 (excluir a conta Google não apaga os dados do espaço): nenhum listener de exclusão de conta foi implementado nesta fase; os documentos de /workspaces e suas subcoleções não referenciam o ciclo de vida da conta Google, então a exclusão de uma conta não dispara cascade delete algum"
  - ".env.local criado com placeholders de emulador (VITE_FIREBASE_PROJECT_ID=cotidiano-dev, VITE_USE_EMULATORS=true) para destravar npm run dev e a suíte de teste — PENDÊNCIA: trocar por credenciais reais do console do Firebase antes do <human-check> (login real) e antes do primeiro deploy"

patterns-established:
  - "Mock de dependência via vi.mock com getter para testar funções que usam um singleton de conexão (db) contra múltiplos contextos de auth no mesmo arquivo de teste, sem mudar a assinatura pública da função"

requirements-completed: [AUTH-01, AUTH-03, AUTH-07]

coverage:
  - id: D1
    description: "Isolamento por membership nas Security Rules: isMember(wsId), /users/{uid} e /workspaces/{workspaceId} substituindo o deny-all da Task 1"
    requirement: "AUTH-07"
    verification:
      - kind: unit
        ref: "tests/firestore.rules.test.ts > isolamento por membership (AUTH-07, T-01-04) > alice lê workspaces/wsA do qual é membro; bob, que não é membro, é negado"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > criação de workspace exige memberIds == [uid do chamador] (T-01-13)"
        status: pass
      - kind: unit
        ref: "tests/firestore.rules.test.ts > workspace nunca pode ser deletado"
        status: pass
    human_judgment: false
  - id: D2
    description: "bootstrapNewWorkspace idempotente no primeiro login — cria workspace + users/{uid} num único writeBatch, retorna cedo se já existir"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "tests/bootstrap.test.ts > bootstrapNewWorkspace (AUTH-01, AUTH-03) > cria exatamente um workspace com alice como único membro; users/alice.workspaceId aponta pra ele"
        status: pass
      - kind: unit
        ref: "tests/bootstrap.test.ts > bootstrapNewWorkspace (AUTH-01, AUTH-03) > idempotência: chamar bootstrapNewWorkspace duas vezes deixa exatamente um workspace"
        status: pass
      - kind: unit
        ref: "tests/bootstrap.test.ts > resolveUserWorkspace > retorna null quando users/bob não existe"
        status: pass
    human_judgment: false
  - id: D3
    description: "users/{uid}.workspaceId é imutável depois de criado — segunda escrita com valor diferente é negada pela regra"
    requirement: "AUTH-01"
    verification:
      - kind: unit
        ref: "tests/firestore.rules.test.ts > users/{uid}.workspaceId é imutável (AUTH-01 concurrency, T-01-12) > segunda escrita de users/alice com workspaceId diferente é negada"
        status: pass
    human_judgment: false
  - id: D4
    description: "Login real com Google (signInWithRedirect) volta autenticado sem tela em branco, e o nome do espaço aparece na tela lido do Firestore por onSnapshot — desktop e celular"
    requirement: "AUTH-01"
    verification: []
    human_judgment: true
    rationale: "Exige credenciais reais de um projeto Firebase com o provedor Google habilitado e um navegador de verdade (desktop + celular); o <human-check> da Task 3 foi deliberadamente deferido (human_verify_mode: end-of-phase da fase) — .env.local hoje só tem placeholders de emulador, não credenciais reais. Cobertura automatizada (build, testes de unidade contra o emulador, greps estruturais em signIn.ts/AuthProvider.tsx) prova a forma do código, não o fluxo OAuth real."

duration: "~50min (Task 3, sessão retomada após checkpoint da Task 2; Task 1 foi uma sessão anterior)"
completed: 2026-08-28
status: complete
---

# Phase 1 Plan 1: Acesso e espaço compartilhado — fatia tracer Summary

**Login com Google via redirect, bootstrap idempotente de workspace com `memberIds: string[]`, e isolamento por membership provado no Firestore Emulator com `isMember()`.**

## Performance

- **Duration:** ~50min nesta sessão (Task 3 — resumida após o checkpoint de decisão da Task 2; Task 1 rodou numa sessão anterior)
- **Completed:** 2026-08-28
- **Tasks:** 2 tasks de execução (Task 1, Task 3) + 1 checkpoint de decisão (Task 2, resolvido pelo usuário)
- **Files modified:** 10 (Task 3) + ~24 (Task 1)

## Accomplishments
- `firestore.rules` real: `isMember(wsId)`, `/users/{uid}` (create/update/read restritos ao próprio uid, `workspaceId` imutável) e `/workspaces/{workspaceId}` (`memberIds == [uid]` no create, isolamento por membership no read, `memberIds` travado fora da ramificação de convite no update, `delete` sempre negado) — substituindo o deny-all da Task 1
- Fluxo de primeiro login completo: `signInWithGoogle()` (redirect) → `AuthProvider` resolve `getRedirectResult` + `onAuthStateChanged` → `WorkspaceProvider` resolve/bootstrapa o workspace → `onSnapshot` traz o nome do espaço pra tela
- `bootstrapNewWorkspace` prova idempotência real contra o emulador: duas chamadas seguidas para o mesmo uid deixam exatamente um workspace
- Isolamento entre workspaces provado por teste: um uid fora de `memberIds` é negado na leitura; criar um workspace com `memberIds` de outro uid é negado
- 18/18 testes verdes contra o Firestore + Auth Emulator (`npm run test:all`), `npm run build` com código 0

## Task Commits

Cada task foi commitada atomicamente:

1. **Task 1: Scaffold do projeto, emulador do Firebase e harness de teste de regras** - `62d71e6` (feat) — sessão anterior
2. **Task 2: Checkpoint — modelo de membership do espaço compartilhado** — sem commit (decisão pura); resolvida pelo usuário: `member-ids-array`
3. **Task 3: Fatia ponta a ponta — entrar com o Google, ganhar um espaço e vê-lo na tela** - `7ce5e9c` (feat)

**Plan metadata:** _(a ser preenchido pelo commit final de docs desta execução)_

_Nota: Task 3 é `tdd="true"` — os casos de `<behavior>` foram escritos em `tests/bootstrap.test.ts` e adicionados a `tests/firestore.rules.test.ts` primeiro, e confirmados falhando contra o `firestore.rules` deny-all e o módulo `bootstrap.ts` inexistente (RED), antes de qualquer implementação. Ver `## TDD Gate Compliance` abaixo sobre por que RED e GREEN não geraram dois commits separados._

## Files Created/Modified

**Task 3 (esta sessão):**
- `firestore.rules` - regras reais de `/users/{uid}` e `/workspaces/{workspaceId}` + `isMember()`
- `src/shared/firebase/client.ts` - init do Firebase App + conexão com emuladores (`VITE_USE_EMULATORS`)
- `src/shared/auth/signIn.ts` - `signInWithGoogle()` (redirect), `signOutOfApp()`
- `src/shared/auth/AuthProvider.tsx` - `AuthProvider`, `useAuth()`, `AuthStatus`
- `src/shared/workspace/bootstrap.ts` - `resolveUserWorkspace`, `bootstrapNewWorkspace`, tipo `Workspace`
- `src/shared/workspace/WorkspaceProvider.tsx` - `WorkspaceProvider`, `useWorkspace()`
- `src/App.tsx` - os três estados mínimos (loading/signed-out/signed-in), sem estilo elaborado
- `tests/bootstrap.test.ts` - prova de AUTH-03 e idempotência do bootstrap
- `tests/firestore.rules.test.ts` - casos de isolamento, criação restrita, imutabilidade de `workspaceId`, `delete` sempre negado
- `vitest.config.ts` - `fileParallelism: false` no projeto `node`
- `.env.local` (não versionado) - placeholders de emulador para destravar `npm run dev`/teste

**Task 1 (sessão anterior, já documentado em commit `62d71e6`):** scaffold Vite/React/TS, `package.json`, tsconfigs, `firebase.json`, `firestore.indexes.json`, `.firebaserc`, `.env.local.example`, `src/shared/money.ts`, `src/shared/date.ts`, `tests/rules-harness.ts`, `tests/money.test.ts`, `tests/date.test.ts`.

## Decisions Made

- **Checkpoint da Task 2 resolvido: `member-ids-array`.** O usuário escolheu `memberIds: string[]` no documento `/workspaces/{workspaceId}` em vez de subcoleção `/members/{uid}`. Decisão de sentido único (`reversibility: one-way`) — entra em `isMember()` e, por herança, em toda Security Rule das fases 2-6. Registrada aqui como fechada; não deve ser revisitada.
- **D-20 (apiKey pública por design):** documentado em `.env.local.example` e reforçado em comentário no topo de `client.ts` — quem protege os dados são as Security Rules.
- **D-21 (conflito de escrita simultânea é last-write-wins, aceito conscientemente):** nenhum mecanismo de merge foi construído; é o comportamento padrão do Firestore, e essa fase não adiciona nada em cima dele.
- **D-22 (excluir a conta Google não apaga os dados do espaço):** nenhum listener de ciclo de vida de conta foi implementado; os documentos do workspace não têm dependência de existência da conta Google do membro.
- **Padrão de teste para funções que usam o `db` singleton contra uids específicos do emulador:** `bootstrap.ts` mantém a assinatura pública `(uid: string)` (contrato fixo do bloco `<interfaces>` do plano, consumido pelos planos 01-02 a 01-06). Para provar que a Security Rule real é respeitada com o uid correto em teste, `tests/bootstrap.test.ts` usa `vi.mock('../src/shared/firebase/client', () => ({ get db() { return activeDb } }))` e troca `activeDb` para `testEnv.authenticatedContext(uid).firestore()` por teste. Isso preserva a assinatura pública inalterada. Registrado aqui porque o plano 01-02 (Task 2, `createInvite`/`joinWorkspace`) vai precisar do mesmo mecanismo — funções lá também só recebem `uid`, sem parâmetro de Firestore.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `vitest.config.ts` precisava de `fileParallelism: false` no projeto `node`**
- **Found during:** Task 3, ao rodar `npm run test:all` com `tests/bootstrap.test.ts` e `tests/firestore.rules.test.ts` juntos
- **Issue:** Os dois arquivos de teste conectam ao mesmo `projectId` do Firestore Emulator (`cotidiano-test`, definido em `tests/rules-harness.ts`). O Vitest roda arquivos de teste em paralelo por padrão; como os dois arquivos compartilham o mesmo banco mutável no emulador, o `clearFirestore()`/as escritas de um arquivo corriam com as leituras/escritas do outro, produzindo falhas não-determinísticas — incluindo um erro genuíno de avaliação de regra (`Property memberIds is undefined on object. for 'list'`) quando um documento malformado de outro arquivo aparecia no meio de uma query `list` sem filtro. Isolado e confirmado via testes de repro dedicados (arquivo único, sem paralelismo de arquivos: sempre verde; múltiplos arquivos, paralelo: intermitente).
- **Fix:** Adicionado `fileParallelism: false` ao projeto `node` de `vitest.config.ts`, com comentário explicando o motivo para os planos seguintes (01-02+ também vão adicionar arquivos de teste contra o mesmo emulador).
- **Files modified:** `vitest.config.ts`
- **Verification:** `npm run test:all` — 18/18 testes verdes de forma consistente (rodado múltiplas vezes)
- **Committed in:** `7ce5e9c` (Task 3)

**2. [Rule 3 - Blocking] `.env.local` não existia**
- **Found during:** Task 3, precondição da task ("projeto Firebase real com Auth habilitado") não está satisfeita neste ambiente (sem acesso a conta Google do usuário)
- **Issue:** `src/shared/firebase/client.ts` e a suíte de testes precisam de `import.meta.env.VITE_FIREBASE_*` para não quebrar em tempo de build/teste; sem `.env.local`, o app não roda (`npm run dev`) e o build TypeScript de `client.ts` não teria valores para inicializar.
- **Fix:** Criado `.env.local` (não versionado, coberto por `*.local` no `.gitignore`) com placeholders de emulador: `VITE_FIREBASE_PROJECT_ID=cotidiano-dev` (mesmo id de `.firebaserc`), `VITE_USE_EMULATORS=true`, e chaves `demo-*` para `apiKey`/`appId`. **Pendência explícita:** antes do `<human-check>` da Task 3 (login real com Google) e antes do primeiro deploy, esses valores precisam ser trocados pelos reais do console do Firebase.
- **Files modified:** `.env.local` (não versionado)
- **Verification:** `npm run build` e `npm run test:all` rodam sem erro de env ausente
- **Committed in:** não commitado (arquivo `.env.local` é intencionalmente ignorado pelo git — `*.local` em `.gitignore`)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Ambas as correções são infraestrutura de teste/dev necessária para completar a task como especificada; nenhuma mudou o comportamento de produção nem afrouxou uma Security Rule. Sem escopo além do que a Task 3 já previa.

## Issues Encountered

- **Corrida entre arquivos de teste do Firestore Emulator (ver Deviations #1).** Vale como aviso para os planos 01-02 a 01-06: qualquer novo arquivo `tests/*.test.ts` que use `withTestEnv()` (mesmo `projectId`) já está coberto pelo `fileParallelism: false` fixado aqui — não precisa reconfigurar, mas é bom saber por quê essa opção existe se um novo arquivo de teste parecer "instável".

## TDD Gate Compliance

Task 3 tem `tdd="true"` no nível da task (o plano inteiro é `type: execute`, não `type: tdd` — o gate de plano RED/GREEN/REFACTOR de commits separados não se aplica aqui). Os casos de `<behavior>` foram escritos em `tests/bootstrap.test.ts` (novo arquivo) e adicionados a `tests/firestore.rules.test.ts` **antes** de qualquer implementação, e a falha (RED) foi confirmada rodando a suíte contra o `firestore.rules` deny-all da Task 1 e o módulo `src/shared/workspace/bootstrap.ts` ainda inexistente — 2 dos 8 testes novos falharam genuinamente nesse ponto (os outros passaram trivialmente sob deny-all, o que também é o resultado esperado sob as regras reais, então não são um RED útil, mas não invalidam o processo). Só depois disso `firestore.rules`, `client.ts`, `signIn.ts`, `AuthProvider.tsx`, `bootstrap.ts`, `WorkspaceProvider.tsx` e `App.tsx` foram escritos, e a suíte voltou a verde (GREEN).

**Desvio do processo:** RED e GREEN não geraram dois commits separados como a seção `<tdd_execution>` do protocolo de execução pede (`test(...)` seguido de `feat(...)`) — o teste e a implementação foram commitados juntos em `7ce5e9c`, porque a task inteira (regras + 6 módulos de produção + 2 arquivos de teste) forma uma única fatia coesa e a confirmação de RED foi feita via execução direta da suíte (documentada acima), não via um commit intermediário. Isso é um desvio de forma, não de substância: a disciplina RED-antes-de-GREEN foi seguida; só o artefato de commit único não reflete os dois passos.

## User Setup Required

None diretamente — mas ver a pendência de `.env.local` acima (Deviations #2): antes do `<human-check>` desta task e antes do primeiro deploy, um projeto Firebase real com Authentication (Google) habilitado precisa existir, e `.env.local` precisa ser preenchido com as credenciais reais (ver `.env.local.example`).

## Next Phase Readiness

- `firestore.rules`, `bootstrap.ts`, `WorkspaceProvider.tsx` e o modelo `memberIds: string[]` estão prontos para o plano 01-02 (convite por link) construir em cima — a ramificação de `update` que permite entrada por convite ainda não existe em `firestore.rules` (deliberadamente, conforme o plano) e é o próximo passo.
- **Human-check pendente (deferido para o fim da fase, `human_verify_mode: end-of-phase`):** login real com uma conta Google de verdade, no desktop e no celular, apontando para um projeto Firebase real (não o emulador) — precisa confirmar (1) o retorno do `signInWithRedirect` cai autenticado sem tela em branco, (2) o nome do espaço aparece na tela, (3) os documentos corretos existem no console do Firebase. Isso fecha a lacuna registrada em `01-RESEARCH.md` §Lacunas sobre `signInWithRedirect` não confirmado contra a documentação/comportamento real.
- **Pendência de infraestrutura:** `.firebaserc` ainda aponta para o id provisório `cotidiano-dev` (registrado como pendência desde a Task 1) e `.env.local` só tem placeholders de emulador — nenhum dos dois bloqueia o desenvolvimento contra o emulador, mas ambos precisam de um projeto Firebase real antes do `<human-check>` e do primeiro deploy.
- Nenhum stub ou dado mockado na UI: `App.tsx` lê `workspace.name` e `user.email` diretamente do estado do `AuthProvider`/`WorkspaceProvider`, que por sua vez vêm do Firestore/Firebase Auth reais (via emulador em dev) — nada hardcoded.

---
*Phase: 01-acesso-e-espa-o-compartilhado*
*Completed: 2026-08-28*

## Self-Check: PASSED

Todos os arquivos citados (firestore.rules, src/shared/firebase/client.ts, src/shared/auth/signIn.ts, src/shared/auth/AuthProvider.tsx, src/shared/workspace/bootstrap.ts, src/shared/workspace/WorkspaceProvider.tsx, tests/bootstrap.test.ts, vitest.config.ts) e ambos os commits (`62d71e6`, `7ce5e9c`) foram confirmados presentes no disco/histórico do git.

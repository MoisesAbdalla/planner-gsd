---
gsd_state_version: 1.0
current_phase: 1
current_phase_name: Acesso e espaço compartilhado
status: executing
stopped_at: Completed 01-05-PLAN.md
last_updated: "2026-08-28T17:46:19.181Z"
last_activity: 2026-08-28
last_activity_desc: Plano 01-05 completo - convite na tela (diálogo de convidar, resgate por link, três telas de falha)
state_head: 0f896d41cceff090b118ece20e82c5b00c8f6043
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 6
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (atualizado 2026-08-27)

**Core value:** Em 10 segundos eu sei quanto gastei, com o quê, e quanto sobra no mês.
**Current focus:** Phase 1 — Acesso e espaço compartilhado

## Current Position

Phase: 1 (Acesso e espaço compartilhado) — EXECUTING
Plan: 5 de 6 na fase atual (01-01, 01-02, 01-03, 01-04, 01-05 completos)
Status: Executing
Last activity: 2026-08-28 — Plano 01-05 completo (convite na tela: diálogo de convidar, resgate por link, três telas de falha)

Progress: [░░░░░░░░░░] 0% (fases completas; 5 de 6 planos da Fase 1 concluídos)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 50min | 2 tasks | 10 files |
| Phase 01 P02 | ~25min | 2 tasks | 5 files |
| Phase 01 P03 | ~90min | 3 tasks | 36 files |
| Phase 01 P04 | ~50min | 2 tasks | 10 files |
| Phase 01-acesso-e-espa-o-compartilhado P05 | ~30min | 2 tasks | 8 files |

## Accumulated Context

### Decisions

Decisões completas em PROJECT.md (Key Decisions). Recentes que afetam o trabalho atual:

- [Roadmap]: Firebase fica no Spark — sem Cloud Functions, sem cron, sem FCM. A sequência da pesquisa que ativava Blaze na Fase 1 está superada.
- [Roadmap]: Proxy da IA fora do Firebase (Cloudflare Workers ou Vercel Hobby, decidir na Fase 5); valida Firebase ID token e segura a chave do LLM no servidor.
- [Roadmap]: Gasto do cartão conta no mês da compra — cada parcela pertence ao mês em que cai.
- [Roadmap]: Cartão/parcelamento posicionado na Fase 3 (meio do roadmap) por ser o maior risco técnico; errar tarde invalida todo número já lançado.
- [Roadmap]: Tarefas (Fase 6) depende só da Fase 1 e é paralelizável com as fases 2–5.
- [Phase 1]: Checkpoint 01-01 Task 2 resolvido: memberIds: string[] em /workspaces/{id} (não subcoleção) — decisão de sentido único herdada pelas Security Rules das fases 2-6
- [Phase 1]: vitest.config.ts: fileParallelism false no projeto node — arquivos de teste contra o Firestore Emulator compartilham o mesmo projectId e corrompem estado se rodarem em paralelo
- [Phase 1]: expiresAt do convite comparado por faixa (request.time, +8d) em vez de igualdade estrita — cliente não prevê o instante exato do commit no servidor
- [Phase 1]: joinWorkspace() mapeia erro genérico de permissão da transação perdedora para invite-already-used — forma concreta do risco residual T-01-08 aceito
- [Phase 1]: CLI shadcn (init/add) está quebrado neste ambiente (bug de detecção de workspace confundindo um diretório irmão não relacionado) — componentes buscados direto do registry oficial via HTTP em vez de `npx shadcn add`; mesma fonte, resultado equivalente
- [Phase 1]: Gate de autenticação do TanStack Router confirmado ao vivo contra a documentação/exemplo oficial (não mais [ASSUMED]): loading fica fora do RouterProvider inteiro, signed-out vira beforeLoad+redirect numa rota pathless _authenticated, router.invalidate() reage a qualquer mudança de status
- [Phase 1]: AuthStatus ganhou o valor 'error' para o BootErrorScreen (E7/error) ser alcançável — onAuthStateChanged agora usa o callback de erro
- [Phase 1]: Open Question 2 de 01-RESEARCH.md resolvida ao vivo — get() de uma Security Rule avaliada dentro de um writeBatch vê o estado anterior ao batch inteiro, mesmo para outro documento do mesmo batch; criar workspace + categoria filha juntos é NEGADO, confirmando que a separação em dois passos aguardados em bootstrapNewWorkspace é estritamente necessária
- [Phase 1]: bootstrapNewWorkspace só chamava seedDefaultCategories na criação do workspace (grep -c precisava retornar 1); corrigido com uma chamada adicional em WorkspaceProvider.tsx quando o workspace já existia, para que a resumibilidade do seeding (CAT-01/empty) se sustente também na reabertura do app, não só na criação
- [Phase 01-acesso-e-espa-o-compartilhado]: Convite na tela: token do convite sobrevive ao redirect do Google via sessionStorage dedicado (src/features/invite/pendingToken.ts); WorkspaceProvider nunca cria espaco proprio enquanto ha um resgate pendente (D-07), assinando /users/{uid} reativamente — Plano 01-05 exigia coordenacao entre entrar.tsx e WorkspaceProvider.tsx sem depender de flag/state global

### Pending Todos

Nenhum ainda.

### Blockers/Concerns

- [Fase 1]: fluxo do código de convite precisa funcionar sem backend — desenho de dados e Security Rule a fechar no planejamento.
- [Fase 3]: materialização client-side de parcelas precisa cobrir "abri direto um mês futuro sem passar pelos intermediários".
- [Fase 5]: escolha do host serverless gratuito e qualidade real do modelo em pt-BR coloquial ainda em aberto.

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-08-28T17:45:07.369Z
Stopped at: Completed 01-05-PLAN.md
Resume file: None

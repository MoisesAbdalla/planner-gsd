---
phase: 1
slug: acesso-e-espa-o-compartilhado
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-28
---

# Phase 1 — Validation Strategy

> Contrato de validação da fase, para amostragem de feedback durante a execução.
> Seeded por `/gsd-plan-phase` a partir de `01-RESEARCH.md` §Validation Architecture.
> Projeto **greenfield**: não existe nenhuma infraestrutura de teste ainda — tudo abaixo é Wave 0.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (a instalar — diretório vazio no início da fase) |
| **Config file** | none — Wave 0 cria |
| **Quick run command** | `vitest run tests/firestore.rules.test.ts` |
| **Full suite command** | `firebase emulators:exec --only firestore,auth "vitest run"` |
| **Estimated runtime** | ~30 segundos (emulador local, sem rede) |

---

## Sampling Rate

- **After every task commit:** `vitest run tests/firestore.rules.test.ts` (contra emulador já em execução)
- **After every plan wave:** `firebase emulators:exec --only firestore,auth "vitest run"`
- **Before `/gsd-verify-work`:** suíte completa verde
- **Max feedback latency:** 30 segundos

---

## Per-Task Verification Map

Task IDs ainda não existem — os planos são criados no passo seguinte deste mesmo workflow.
Esta tabela é **por requisito**; o planejador deve amarrar cada linha a um task ID concreto
ao escrever os PLAN.md, e preencher a coluna Threat Ref a partir do `<threat_model>` de cada plano.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | — | — | Infraestrutura de teste existe e roda contra o emulador | setup | `vitest run` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | AUTH-07 | TBD | Usuário do espaço A não lê nem grava nada do espaço B | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t isolamento"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | AUTH-04 | TBD | Convite é criado com token de alta entropia, `status: pending` e expiração de 7 dias | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | AUTH-05 | TBD | Resgate só passa com token válido, não expirado e `pending`; segundo resgate do mesmo token é negado | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | AUTH-05 | TBD | **Usuário autenticado que nunca viu o link NÃO consegue entrar no espaço** (a falha mais perigosa identificada na pesquisa) | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | AUTH-03 | TBD | Primeiro login cria workspace com o usuário como único membro | integration | `vitest run tests/bootstrap.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 1 | CAT-01 | — | Workspace novo nasce com as 12 categorias pt-BR | integration | `vitest run tests/categories.test.ts -t seed` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | CAT-02, CAT-03 | — | Criar categoria e editar nome/cor persistem e respeitam a paleta fixa | integration | `vitest run tests/categories.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | CAT-04 | TBD | Arquivar não deleta — o documento permanece e continua referenciável | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t archive"` | ❌ W0 | ⬜ pending |
| TBD | TBD | 2 | AUTH-01, AUTH-02 | TBD | Login e logout com Google funcionam e limpam a sessão | manual | — | — | ⬜ pending |
| TBD | TBD | 2 | AUTH-06 | — | Os dois membros veem a mesma lista de categorias em tempo real | manual | — | — | ⬜ pending |
| TBD | TBD | 2 | PLAT-01, PLAT-02 | — | Todas as telas em pt-BR, sem rolagem horizontal, no celular e no desktop | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nada existe ainda — o diretório do projeto contém só `.planning/`.

- [ ] `npm install -D vitest @firebase/rules-unit-testing firebase-tools` — nenhum framework de teste instalado
- [ ] `firebase.json` com bloco `emulators` (firestore + auth) — sem ele nenhum teste de regra roda
- [ ] `firestore.rules` — o artefato sob teste
- [ ] `tests/firestore.rules.test.ts` — cobre AUTH-04, AUTH-05, AUTH-07, CAT-04
- [ ] `tests/bootstrap.test.ts` — cobre AUTH-03
- [ ] `tests/categories.test.ts` — cobre CAT-01, CAT-02, CAT-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login e logout com a conta Google | AUTH-01, AUTH-02 | O fluxo OAuth do Google não roda no emulador de Auth de forma fiel — o emulador simula o provedor, não valida a experiência real de popup/redirect | Entrar com uma conta Google real, navegar entre os módulos, sair de uma tela qualquer, confirmar que voltou para a tela de entrar e que recarregar não restaura a sessão |
| Dois membros veem a mesma categoria em tempo real | AUTH-06 | E2E multi-sessão (dois navegadores autenticados simultaneamente) é caro de automatizar e frágil frente ao ganho | Abrir o app em dois navegadores com contas diferentes no mesmo espaço; criar uma categoria em um e confirmar que aparece no outro sem recarregar |
| Interface em pt-BR e sem rolagem horizontal | PLAT-01, PLAT-02 | Julgamento visual — é o que a sonda de UI classificou como `backstop` | Percorrer todas as telas da fase a 320px e em desktop largo; confirmar ausência de rolagem horizontal, textos em português e truncamento correto de nome longo de categoria e de espaço |
| Link de convite abre corretamente vindo do WhatsApp | AUTH-05 | Comportamento de WebView do WhatsApp não é reproduzível em teste automatizado (Open Question registrada na pesquisa) | Mandar o link de convite por WhatsApp para um segundo aparelho e abrir a partir do app |

---

## Validation Sign-Off

- [ ] Todas as tasks têm verify `<automated>` ou dependência declarada de Wave 0
- [ ] Continuidade de amostragem: nunca 3 tasks consecutivas sem verify automatizado
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Nenhuma flag de watch-mode nos comandos
- [ ] Latência de feedback < 30s
- [ ] `nyquist_compliant: true` no frontmatter

**Approval:** pending

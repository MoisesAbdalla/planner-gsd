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

Task IDs amarrados aos planos reais em 2026-08-28 pelo `/gsd-plan-phase`. Convenção de id:
`01-{plano}-T{n}`, onde `{plano}` é o número do PLAN.md e `{n}` a posição da task dentro dele.
A coluna Threat Ref aponta para o `<threat_model>` do plano correspondente.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-T1 | 01-01 | 1 | — | T-01-09, T-01-SC | Infraestrutura de teste existe e roda contra o emulador; `firestore.rules` nasce negando tudo e o caso do usuário anônimo passa | setup | `npm run test:rules` | ❌ W0 | ⬜ pending |
| 01-01-T1 | 01-01 | 1 | — | — | Convenções D-23 (centavos) e D-24 (`America/Sao_Paulo`) fixadas em código com teste | unit | `npx vitest run tests/money.test.ts tests/date.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-T2 | 01-01 | 1 | AUTH-03 | — | Checkpoint de decisão: modelo de membership (porta de sentido único, D-05) | checkpoint | — | — | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | AUTH-03 | T-01-13 | Primeiro login cria workspace com o usuário como único membro, e reexecutar não cria um segundo | integration | `npx vitest run tests/bootstrap.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | AUTH-07 | T-01-04, T-01-12 | Usuário fora de `memberIds` é negado na leitura do workspace; `/users/{uid}.workspaceId` é imutável | rules-unit | `npm run test:rules` | ❌ W0 | ⬜ pending |
| 01-01-T3 | 01-01 | 1 | AUTH-01 | — | Login real com conta Google via redirect volta autenticado no desktop e no celular | manual | — | — | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | AUTH-07 | T-01-04 | Usuário do espaço B não lê nem grava nada do espaço A, com dois espaços de verdade | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t isolamento"` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | AUTH-04 | T-01-01 | Convite é criado com `status: pending`, expiração de 7 dias e `createdBy` igual ao chamador; `list` é sempre negado | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | AUTH-05 | T-01-03, T-01-06 | Resgate só passa com token válido, não expirado e `pending`; segundo resgate é negado; só `status`, `usedBy` e `usedAt` podem mudar | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | AUTH-05 | **T-01-02** | **Usuário autenticado que nunca viu o link NÃO consegue entrar no espaço** — sem token, com token errado, e com token de outro espaço (a falha mais perigosa identificada na pesquisa) | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| 01-02-T1 | 01-02 | 2 | AUTH-05 | T-01-05 | Quem já pertence a um espaço é negado ao resgatar convite de outro | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t convite"` | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | AUTH-04 | T-01-01 | Token gerado por `crypto.randomUUID()` é o ID do documento; dois convites seguidos têm tokens distintos | integration | `npx vitest run tests/invite.test.ts` | ❌ W0 | ⬜ pending |
| 01-02-T2 | 01-02 | 2 | AUTH-05 | T-01-03, T-01-08 | Resgate concorrente do mesmo token resulta em exatamente um sucesso, via `runTransaction` com `tx.get()` | integration | `npx vitest run tests/invite.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 2 | PLAT-01, PLAT-02 | T-01-SC | Tokens de tema claro e escuro existem os dois; a paleta fixa tem exatamente 12 tons | unit | `npm run build` + verificação de contagem em `src/shared/theme/tokens.ts` | ❌ W0 | ⬜ pending |
| 01-03-T1 | 01-03 | 2 | PLAT-01, PLAT-02 | — | Contraste real renderizado atinge 4.5:1 no texto e 3:1 nos tons de categoria, nos dois temas | manual | — | — | ⬜ pending |
| 01-03-T2 | 01-03 | 2 | PLAT-02 | T-01-16 | Shell alterna entre barra inferior e rail em 768px; só o id do módulo vai para armazenamento local | component | `npx vitest run tests/shell.test.tsx` | ❌ W0 | ⬜ pending |
| 01-03-T2 | 01-03 | 2 | PLAT-02 | — | Nenhuma rolagem horizontal a 320px, 768px e desktop largo; item ativo reconhecível em escala de cinza; foco de teclado visível | manual | — | — | ⬜ pending |
| 01-03-T3 | 01-03 | 2 | AUTH-01, AUTH-02 | T-01-15, T-01-17 | Gate de autenticação decide por `onAuthStateChanged`; sair da conta limpa a sessão sem apagar dado do espaço | component | `npx vitest run tests/shell.test.tsx` | ❌ W0 | ⬜ pending |
| 01-03-T3 | 01-03 | 2 | AUTH-01, AUTH-02 | — | Login e logout com Google reais funcionam e recarregar não restaura a sessão | manual | — | — | ⬜ pending |
| 01-03-T3 | 01-03 | 2 | PLAT-01 | — | Nome do espaço editável recusa vazio e reverte ao valor anterior quando a gravação falha | component | `npx vitest run tests/shell.test.tsx` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | CAT-01 | — | Workspace novo nasce com as 12 categorias pt-BR, com IDs slug determinísticos e a cor da paleta fixa | integration | `npx vitest run tests/categories.test.ts -t seed` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | CAT-01 | — | Reexecutar o seeding deixa exatamente 12 documentos, e retomar um seeding parcial não duplica | integration | `npx vitest run tests/categories.test.ts -t seed` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | CAT-04 | T-01-19, T-01-18 | Arquivar não deleta — o documento permanece; `delete` é negado; a categoria Outros não pode ser arquivada nem por requisição forjada | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t archive"` | ❌ W0 | ⬜ pending |
| 01-04-T1 | 01-04 | 3 | AUTH-07 | T-01-04 | Membro do espaço B é negado ao ler e ao gravar categorias do espaço A | rules-unit | `firebase emulators:exec --only firestore "vitest run tests/firestore.rules.test.ts -t isolamento"` | ❌ W0 | ⬜ pending |
| 01-04-T2 | 01-04 | 3 | CAT-02, CAT-03 | — | Criar categoria e editar nome e cor persistem e respeitam a paleta fixa | integration | `npx vitest run tests/categories.test.ts` | ❌ W0 | ⬜ pending |
| 01-04-T2 | 01-04 | 3 | AUTH-06 | — | A consulta ordena por nome de forma estável e duas criações concorrentes produzem dois documentos | integration | `npx vitest run tests/categories.test.ts` | ❌ W0 | ⬜ pending |
| 01-05-T1 | 01-05 | 4 | AUTH-04 | T-01-21 | O diálogo gera o link, compartilha no WhatsApp e copia, sem exibir nada do espaço | component | `npx vitest run tests/invite-ui.test.tsx` | ❌ W0 | ⬜ pending |
| 01-05-T2 | 01-05 | 4 | AUTH-05 | T-01-02, T-01-21 | Resgate leva ao Financeiro; as três falhas têm tela cheia própria e nenhuma vaza metadado do espaço; `bootstrapNewWorkspace` não é chamado com token presente | component | `npx vitest run tests/invite-ui.test.tsx` | ❌ W0 | ⬜ pending |
| 01-05-T2 | 01-05 | 4 | AUTH-05, AUTH-06 | T-01-22 | Link de convite mandado por WhatsApp abre e permite o login do Google em Android e em iPhone; a segunda conta vê as mesmas categorias em tempo real | manual | — | — | ⬜ pending |
| 01-06-T1 | 01-06 | 4 | CAT-04, AUTH-06 | T-01-18 | A lista cobre os cinco estados; a linha de Outros não oferece arquivar; arquivadas ficam agrupadas atrás do controle fechado | component | `npx vitest run tests/categories-ui.test.tsx` | ❌ W0 | ⬜ pending |
| 01-06-T2 | 01-06 | 4 | CAT-02, CAT-03 | T-01-23 | Nome vazio e nome duplicado normalizado são recusados inline; duplo toque não cria duas categorias; a grade tem 12 swatches | component | `npx vitest run tests/categories-ui.test.tsx` | ❌ W0 | ⬜ pending |
| 01-06-T3 | 01-06 | 4 | CAT-04 | T-01-19 | Arquivar usa diálogo neutro que diz que o histórico permanece; cancelar não grava; nenhum caminho de interface exclui categoria | component | `npx vitest run tests/categories-ui.test.tsx` | ❌ W0 | ⬜ pending |
| 01-06-T3 | 01-06 | 4 | PLAT-01, PLAT-02 | — | Tela de categorias em pt-BR e sem rolagem horizontal a 320px, 768px e desktop largo, nos dois temas | manual | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Nada existe ainda — o diretório do projeto contém só `.planning/`, `.claude/` e `.git/`.
**Todo o Wave 0 é criado pela task `01-01-T1`** (plano `01-01-PLAN.md`), com exceção dos arquivos de
teste que nascem junto das tasks que os exercitam.

| Item | Criado por | Cobre |
|---|---|---|
| `npm install -D vitest @firebase/rules-unit-testing firebase-tools` | 01-01-T1 | toda a suíte |
| `firebase.json` com bloco `emulators` (firestore 8080 + auth 9099) | 01-01-T1 | sem ele nenhum teste de regra roda |
| `firestore.indexes.json` versionado | 01-01-T1 | pré-requisito da Fase 2 |
| `vitest.config.ts` e `tests/rules-harness.ts` (`withTestEnv`) | 01-01-T1 | toda a suíte de regras |
| `firestore.rules` (nasce negando tudo) | 01-01-T1 | o artefato sob teste |
| `tests/money.test.ts`, `tests/date.test.ts` | 01-01-T1 | convenções D-23 e D-24 |
| `tests/firestore.rules.test.ts` | 01-01-T1 (caso anônimo), 01-01-T3, 01-02-T1, 01-04-T1 | AUTH-03, AUTH-04, AUTH-05, AUTH-07, CAT-04 |
| `tests/bootstrap.test.ts` | 01-01-T3 | AUTH-03 |
| `tests/invite.test.ts` | 01-02-T2 | AUTH-04, AUTH-05 |
| `tests/shell.test.tsx` | 01-03-T2, 01-03-T3 | AUTH-01, AUTH-02, PLAT-02 |
| `tests/categories.test.ts` | 01-04-T1, 01-04-T2 | CAT-01, CAT-02, CAT-03, AUTH-06 |
| `tests/invite-ui.test.tsx` | 01-05-T1, 01-05-T2 | AUTH-04, AUTH-05 |
| `tests/categories-ui.test.tsx` | 01-06-T1, 01-06-T2, 01-06-T3 | CAT-02, CAT-03, CAT-04 |

**Continuidade de amostragem:** nenhuma sequência de 3 tasks consecutivas fica sem `<automated>`.
A única task sem comando automatizado é o checkpoint `01-01-T2`, que fica entre duas tasks
com suíte verde (`01-01-T1` e `01-01-T3`).

---

## Manual-Only Verifications

Com `workflow.human_verify_mode = end-of-phase`, nenhuma destas verificações interrompe a execução:
cada uma vive num bloco `<verify><human-check>` da task indicada e é colhida no fim da fase.

| Task ID | Behavior | Requirement | Why Manual | Test Instructions |
|---------|----------|-------------|------------|-------------------|
| 01-01-T3, 01-03-T3 | Login e logout com a conta Google | AUTH-01, AUTH-02 | O fluxo OAuth do Google não roda no emulador de Auth de forma fiel — o emulador simula o provedor, não valida a experiência real de popup/redirect. Também fecha a lacuna de `signInWithRedirect` registrada na pesquisa | Entrar com uma conta Google real, navegar entre os módulos, sair de uma tela qualquer, confirmar que voltou para a tela de entrar e que recarregar não restaura a sessão |
| 01-05-T2, 01-06-T1 | Dois membros veem a mesma categoria em tempo real | AUTH-06 | E2E multi-sessão (dois navegadores autenticados simultaneamente) é caro de automatizar e frágil frente ao ganho | Abrir o app em dois navegadores com contas diferentes no mesmo espaço; criar uma categoria em um e confirmar que aparece no outro sem recarregar |
| 01-03-T1, 01-03-T2, 01-06-T3 | Interface em pt-BR e sem rolagem horizontal, nos dois temas | PLAT-01, PLAT-02 | Julgamento visual — é o que a sonda de UI classificou como `backstop` | Percorrer todas as telas da fase a 320px, a 768px e em desktop largo, em tema claro e escuro; confirmar ausência de rolagem horizontal, textos em português e truncamento correto de nome longo de categoria e de espaço |
| 01-03-T1 | Contraste real renderizado | PLAT-01, PLAT-02 | O UI-SPEC declara alvos (4.5:1 no texto, 3:1 nos tons de categoria); só a medição sobre o render real confirma | Medir com ferramenta de contraste o texto de corpo contra a superfície e cada um dos 12 tons contra o fundo, nos dois temas |
| 01-05-T2 | Link de convite abre corretamente vindo do WhatsApp | AUTH-05 | Comportamento de navegador embutido do WhatsApp não é reproduzível em teste automatizado (Open Question 3 registrada na pesquisa) | Mandar o link de convite por WhatsApp para um segundo aparelho e abrir a partir da conversa, num Android e num iPhone; registrar o comportamento observado no SUMMARY |

---

## Validation Sign-Off

- [ ] Todas as tasks têm verify `<automated>` ou dependência declarada de Wave 0
- [ ] Continuidade de amostragem: nunca 3 tasks consecutivas sem verify automatizado
- [ ] Wave 0 cobre todas as referências MISSING
- [ ] Nenhuma flag de watch-mode nos comandos
- [ ] Latência de feedback < 30s
- [ ] `nyquist_compliant: true` no frontmatter

**Approval:** pending

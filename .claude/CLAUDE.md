<!-- GSD:project-start source:PROJECT.md -->

## Project

**Cotidiano**

Um app web responsivo (celular e desktop) que junta duas coisas do dia a dia num lugar só: um **planner de tarefas** do cotidiano e um **controle financeiro pessoal**. O diferencial é o assistente de IA conversacional no lado financeiro — em vez de preencher formulário, você escreve "almoço 32 no cartão" e o lançamento aparece categorizado; e pergunta "quanto gastei com comida esse mês?" e ele responde olhando seus dados reais.

É para uso pessoal compartilhado: o dono e mais uma pessoa (parceiro(a)/família) lançam no mesmo mês e enxergam o mesmo quadro. Tudo em português brasileiro, com R$, datas e a conversa da IA em pt-BR.

**Core Value:** **Em 10 segundos eu sei quanto gastei, com o quê, e quanto sobra no mês.**

Se o planner de tarefas falhar, ainda vale a pena. Se essa clareza financeira falhar, o app não tem motivo pra existir.

### Constraints

- **Privacidade**: dados financeiros pessoais e compartilhados — isolamento por espaço e regras de acesso restritivas são obrigatórios, não desejáveis
- **Idioma**: tudo em português brasileiro (interface, formatos de data, moeda R$, e as respostas da IA)
- **Plataforma**: web responsiva única — precisa funcionar bem no celular (lançar gasto na fila do mercado) e no desktop (organizar o mês)
- **Autenticação**: Firebase Authentication com provedor Google — decidido pelo usuário
- **Persistência**: Cloud Firestore — decidido pelo usuário
- **Design**: a interface deve ser conduzida pela skill `frontend-design`, não por layout padrão de framework

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## 1. Frontend framework: Vite + React SPA — NÃO Next.js

| Tecnologia | Versão (npm, ago/2026) | Propósito | Confiança |
|---|---|---|---|
| `vite` | 8.2.2 | Bundler/dev server | HIGH |
| `react` / `react-dom` | 19.2.8 | UI | HIGH |
| `@tanstack/react-router` | 1.170.32 | Roteamento com rotas e search-params tipados | MEDIUM |
| `typescript` | 7.0.2 | Tipagem estática | HIGH |

## 2. Hosting: Firebase Hosting (clássico) — NÃO Vercel, NÃO Firebase App Hosting

## 3. UI/estilo: Tailwind CSS v4 + shadcn/ui — NÃO uma kit de componentes com identidade própria

## 4. Camada de IA: Vercel AI SDK, rodando em Firebase Cloud Functions (nunca no cliente)

## 5. Dinheiro em JavaScript: centavos inteiros + Dinero.js v2 — NUNCA float

- **Armazenamento no Firestore:** todo valor monetário é um inteiro em centavos (`3250` para R$ 32,50). Firestore lida bem com inteiros arbitrariamente grandes sem perda de precisão — bem diferente de tentar guardar `32.50` como `number` e sofrer erro de ponto flutuante em somas.
- **Aritmética (somas de categoria, saldo do mês, teto de orçamento):** use `dinero.js` v2 (`dinero({ amount: 3250, currency: BRL })`). É imutável, tree-shakeable, e mais importante para este projeto: tem `allocate()`, que divide um valor entre N proporções distribuindo o resto (centavo de arredondamento) de forma justa para a maior parte. Isso resolve **diretamente** o requisito de compra parcelada do PROJECT.md — dividir R$ 100,00 em 3x não pode virar R$ 33,33 × 3 = R$ 99,99 "perdendo" um centavo; `allocate(dinero(10000), [1,1,1])` devolve `[3334, 3333, 3333]`, que soma exatamente 10000.
- **Exibição:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCentavos / 100)` — nativo do browser, já formata como "R$ 32,50" com separador de milhar/decimal brasileiro correto, sem biblioteca extra.

## 6. Data/hora, recorrência e parcelas

- **Formatação e locale:** `date-fns` v4 inclui suporte nativo a fuso horário via `@date-fns/tz` e tem locale `pt-BR` embutido (`import { ptBR } from 'date-fns/locale'`) — datas como "5 de agosto" e "segunda-feira" saem corretas sem trabalho extra. Fixe o fuso em `America/Sao_Paulo` para decidir corretamente "isso vence hoje" e "esse gasto é de qual mês", especialmente perto da virada do dia/mês.
- **Por que não a API nativa `Temporal`:** o `Temporal` chegou nativamente no Chrome 144 (jan/2026) — é o futuro certo do JS para datas — mas **ainda não tem suporte garantido em todos os browsers principais** em meados de 2026. Como o requisito do projeto é funcionar bem no celular real do usuário (não só em um browser específico), depender de `Temporal` nativo sem polyfill é prematuro agora. Reavalie quando a cobertura cross-browser estiver consolidada (uma revisão de stack futura, não v1).
- **Recorrência (contas fixas mensais, tarefas semanais):** `rrule` implementa RFC-5545 (o mesmo padrão do Google Calendar/iCal) — cobre "toda segunda", "todo dia 5" e casos como "toda última sexta do mês" sem lógica caseira de calendário. **Padrão de armazenamento recomendado:** guarde a regra (`RRULE:FREQ=MONTHLY;BYMONTHDAY=5`) e a data da última ocorrência materializada no Firestore, e gere/"materialize" as próximas ocorrências sob demanda (ex.: ao abrir o mês) em vez de pré-criar anos de documentos de tarefa/conta.
- **Parcelas:** combine `addMonths` do date-fns (uma parcela por mês, a partir da data da compra) com `allocate()` do Dinero.js (Seção 5) para o valor de cada parcela — a data vem do date-fns, o valor (com resto justo) vem do Dinero.

## 7. Formulários, validação e busca/estado de dados

- **Formulários:** React Hook Form + Zod é o par padrão de mercado — schema único (`zod`) reaproveitado tanto na validação client-side do formulário quanto (idealmente, o mesmo schema ou um espelho dele) na Cloud Function que grava no Firestore e no `generateObject` da IA (Seção 4), reduzindo divergência entre "o que a IA extrai" e "o que o formulário de confirmação valida".
- **Dados em tempo real (Firestore):** **não** force o Firestore para dentro do TanStack Query. `onSnapshot` já é, ele mesmo, um cache reativo com push de atualizações — replicar isso dentro do cache do React Query exige sincronizar manualmente (`queryClient.setQueryData` a cada evento, `staleTime: Infinity`, contagem de listeners ativos para não vazar). É um padrão conhecido, mas evitável. Prefira hooks dedicados por cima do SDK do Firebase: `react-firebase-hooks` (`useCollection`, `useDocumentData`, `useAuthState`) é leve e cobre os casos deste app (lista de tarefas do mês, lançamentos do mês, estado de auth) sem boilerplate de `useEffect`/`onSnapshot` manual.
- **Dados que NÃO são Firestore (chamadas à IA):** aqui sim o TanStack Query se paga — `parseExpense`/`askFinance` são chamadas HTTP (`httpsCallable`) para as Cloud Functions, e o React Query dá de graça estado de loading/erro/retry/cache para essas chamadas assíncronas pontuais.

## 8. Testes, incluindo Firebase Emulator Suite

- **Regras de segurança do Firestore (o requisito de privacidade do projeto é literalmente isto):** o requisito "dados de cada espaço isolados dos demais" só está verificado se houver teste automatizado provando isso — não é algo para confiar só na leitura manual das regras. `@firebase/rules-unit-testing` roda contra o **Firestore Emulator** local (via `firebase emulators:start`) e permite simular usuários autenticados diferentes (`testEnv.authenticatedContext(uid)`) para escrever casos como: "usuário A não consegue ler o workspace de usuário C", "os dois membros autorizados do mesmo workspace conseguem ler e escrever", "usuário não autenticado é sempre negado". Isso deve rodar em CI a cada mudança nas `firestore.rules`.
- **Cloud Functions de IA:** teste as funções `parseExpense`/`askFinance` contra o **Emulator Suite** (Functions + Firestore + Auth juntos), mas **não** chame a API real do Gemini nos testes automatizados — injete um provider fake do AI SDK (o pacote `ai` expõe utilitários de mock de `LanguageModel` para isso) para testar a lógica de extração/tool-calling sem custo, sem flakiness de rede e sem depender de cota de API em CI.
- **Runner:** `vitest` em vez de Jest — integra nativamente com o Vite já usado no frontend (mesma config de transform/aliases), é mais rápido, e evita manter duas configurações de build paralelas (uma para app, outra para testes).
- **Componentes React:** Vitest + React Testing Library é o padrão de fato para testar formulários (o diálogo de confirmação do lançamento da IA é um candidato óbvio a teste: garantir que ele nunca grava sem clique explícito de confirmação — esse comportamento é uma decisão de produto travada no PROJECT.md).

## Instalação

# Frontend (SPA)

# Tailwind v4 + shadcn/ui

# Cloud Functions (pasta functions/)

# Dev/test tooling

## Alternativas Consideradas

| Recomendado | Alternativa | Quando usar a alternativa |
|---|---|---|
| Vite + React SPA | Next.js App Router | Se o projeto ganhar páginas públicas/SEO (ex.: landing marketing separada) — aí vale um app Next.js **separado** só para essa parte, mantendo o app autenticado como SPA |
| TanStack Router | React Router v7 (SPA mode) | Se preferir uma API mais familiar/menos nova; funciona igualmente bem sem servidor |
| Firebase Hosting (estático) | Firebase App Hosting | Se decidir migrar para Next.js com SSR de fato no futuro |
| Vercel AI SDK | Firebase Genkit | Se quiser tracing/eval nativos no console Firebase e aceitar ficar mais preso ao ecossistema Google |
| Dinero.js v2 | `currency.js` | Se peso de bundle for mais crítico que a garantia de `allocate()` para parcelas |
| `react-firebase-hooks` | `reactfire` | Se preferir um padrão Suspense-first oficial da equipe Firebase |
| Tool calling direto no Firestore | RAG com embeddings (LangChain + vector DB) | Nunca, para este projeto — dados financeiros pequenos e estruturados não devem passar por busca semântica aproximada |

## O Que NÃO Usar

| Evitar | Por quê | Usar Em Vez Disso |
|---|---|---|
| Next.js App Router para este app | Firestore `onSnapshot` só roda em Client Components; sem página pública para justificar SSR, você paga a complexidade (ponte de cookie de auth, dois runtimes) sem o benefício | Vite + React SPA |
| Vercel como host | Sem CLI instalada; adiciona um segundo vendor para um app 100% Firebase por baixo, sem usar o diferencial de SSR da Vercel | Firebase Hosting |
| Kits de UI com identidade visual própria (MUI, Ant Design, Chakra) | Conflita com o requisito explícito de design conduzido pela skill `frontend-design`, não por template | Tailwind v4 + shadcn/ui (componentes copiados, restilizáveis) |
| Chamar a API do LLM direto do navegador | Expõe a chave de API no bundle JS — qualquer um rouba e gasta a cota | Cloud Function `onCall` com o segredo em `firebase functions:secrets:set` |
| RAG com embeddings/vector DB para "pergunte sobre seus dados" | Dados financeiros exigem exatidão; busca semântica aproxima em vez de responder o número certo — inaceitável para o core value do produto | Tool calling que consulta o Firestore diretamente |
| `number` float para dinheiro | Erro de ponto flutuante acumulado (`0.1+0.2!==0.3`) — inaceitável num app cujo valor central é "eu sei exatamente quanto sobra" | Inteiro em centavos + Dinero.js |
| Moment.js | Projeto em modo de manutenção, mutável, bundle grande | date-fns v4 |
| Temporal API nativo como base do app hoje | Suporte cross-browser ainda não garantido em meados de 2026 | date-fns v4 (+ `@date-fns/tz`) |
| Redux/MobX para estado global | Firestore listeners + TanStack Query + rota já cobrem o estado necessário para um app de 2 usuários; camada extra sem ganho | Hooks dedicados de Firestore + TanStack Query |
| Testar contra o projeto Firebase de produção | Risco de gastar cota real e corromper dado real de um app de uso pessoal | Firebase Emulator Suite sempre |

## Padrões de Stack por Variante

- Crie um segundo app Next.js só para a landing/marketing, separado do app autenticado (SPA)
- Porque: mantém o app principal simples (sem SSR) e isola a única parte que de fato precisa de SSR/SEO
- Troque o provider no Vercel AI SDK (`@ai-sdk/anthropic` ou `@ai-sdk/openai`) mudando só o import na Cloud Function
- Porque: a escolha do AI SDK (Seção 4) foi feita justamente para deixar essa troca barata

## Compatibilidade de Versões

| Pacote A | Compatível com | Observação |
|---|---|---|
| `tailwindcss@4.x` | `shadcn@4.x` | shadcn CLI v4 já assume Tailwind v4 (CSS-first `@theme`, sem `tailwind.config.js`) por padrão |
| `firebase-functions@7.x` | Node `>=18` | `firebase-tools@15.x` exige Node `>=20`; padronize o projeto em Node 20 LTS para CLI e Functions coexistirem sem atrito |
| `@tanstack/react-router@1.x` | `@tanstack/react-query@5.x` | Mesma família TanStack; integração de loaders com Query é documentada e comum |
| `ai@7.x` | `@ai-sdk/google@4.x` | Confirmar compatibilidade de major version no momento da instalação — o AI SDK evolui rápido e providers às vezes ficam uma versão atrás do core |

## Sources

- Busca cross-verificada (WebSearch, múltiplas queries independentes por tópico) — ver detalhes por seção acima
- `npm view <pacote> version` — consulta direta ao npm registry em 2026-08-27/28, fonte primária para os números de versão citados neste documento (reconfirmar em `package.json`/`npm outdated` no momento real da instalação)
- firebase.google.com/docs/hosting/frameworks/nextjs, firebase.blog (posts de App Hosting GA e "App Hosting vs. Hosting") — status de SSR no Firebase
- dinerojs.com (docs de `allocate`) — comportamento de distribuição de resto
- ai.google.dev/gemini-api/docs/models — nomenclatura de modelo Gemini (verificar id atual antes de implementar; muda com frequência)
- firebase.google.com/docs/rules/unit-tests, firebase.google.com/docs/rules/emulator-setup — testes de Security Rules com Emulator Suite

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

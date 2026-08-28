# Phase 1: Acesso e espaço compartilhado - Context

**Gathered:** 2026-08-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Duas pessoas entram no app com a conta Google e passam a compartilhar um mesmo espaço de dados, isolado de qualquer outro espaço. O espaço já nasce com categorias em português editáveis, e o app é usável no celular e no desktop.

Cobre: AUTH-01..07, CAT-01..04, PLAT-01, PLAT-02 (13 requisitos).

Não cobre — e não deve vazar para cá: qualquer lançamento financeiro, tela de mês, cartão, orçamento, IA ou tarefa. Esta fase entrega acesso, isolamento e o shell visual do app.

</domain>

<decisions>
## Implementation Decisions

### Fluxo do convite

- **D-01:** O convite é um **link pronto para compartilhar** (WhatsApp), com o código embutido na URL. A pessoa abre o link, loga com o Google e já entra no espaço. Não há tela de digitar código. — **Reversibility:** costly — trocar para código digitável depois muda o formato do código (longo/aleatório → curto), a rota de entrada e a Security Rule que valida a associação; convites já distribuídos deixam de funcionar.
- **D-02:** Como ninguém digita o código, ele deve ser **longo e aleatório**. Isso é requisito de segurança, não estética: sem Cloud Functions não existe rate limiting, então a única defesa contra adivinhação por força bruta é o tamanho do espaço de busca.
- **D-03:** O convite **expira**. Prazo padrão: 7 dias (discricionário — ver Claude's Discretion). Motivo dado pelo usuário: um link vazado no histórico do WhatsApp não deve ser porta aberta para sempre.
- **D-04:** O convite é de **uso único** — assim que alguém entra por ele, o convite morre. Convidar uma segunda pessoa exige gerar um link novo.
- **D-05:** **Não há limite fixo de membros** por espaço. O modelo de dados deve suportar N membros desde o início, mesmo que na prática sejam dois. — **Reversibility:** one-way — o modelo de membership (lista de membros vs. par fixo) atravessa as Security Rules de todas as coleções das fases 2–6; mudar depois é migração de dados e reescrita de regras.
- **D-06:** A validação da entrada acontece na **Security Rule do Firestore**, não em servidor. Esse é o desenho central da fase e o blocker registrado em STATE.md.

### Primeiro dia no espaço

- **D-07:** No primeiro login o usuário **cai direto num espaço pronto e usável** — sem tela intermediária de "criar ou entrar". Quem chega por link de convite entra no espaço do link em vez de ter um criado.
- **D-08:** O espaço tem **nome editável** (ex.: "Casa", "Nós dois"), exibido no topo.
- **D-09:** O espaço nasce com **12 categorias** de gasto em pt-BR: Mercado, Alimentação, Transporte, Moradia, Saúde, Lazer, Assinaturas, Educação, Vestuário, Pets, Presentes, Outros.
- **D-10:** A cor da categoria vem de uma **paleta fixa** (~10–12 cores pré-escolhidas), não de um seletor livre. Motivo: garantir legibilidade da tela do mês e dos gráficos nos temas claro e escuro, que a Fase 2 em diante vai depender.
- **D-11:** Arquivar categoria **preserva os lançamentos já feitos nela** (CAT-04) — arquivar não é apagar. A categoria arquivada some das listas de escolha mas continua rotulando o histórico.

### Shell de navegação

- **D-12:** Navegação principal entre **Financeiro e Tarefas** por barra fixa **embaixo no celular** (alcance do polegar) e **menu lateral no desktop**. — **Reversibility:** costly — o shell é herdado por todas as telas das fases 2–6; trocar depois mexe no layout de cada uma.
- **D-13:** Ao abrir, o app volta **onde o usuário parou** (último módulo usado, persistido localmente). Na primeiríssima abertura, abre no **Financeiro** — é onde mora o core value.
- **D-14:** Categorias, "convidar alguém" e "sair da conta" ficam num **menu no avatar** do Google, não como terceiro destino da navegação principal.

### Direção visual

- **D-15:** **Espaçoso e calmo** — bastante respiro, poucos elementos por tela, tipografia generosa. Justificativa do usuário aceita: finanças já são assunto ansioso; a interface não deve somar a isso.
- **D-16:** O tema **segue o sistema** (claro e escuro). Ambas as paletas são obrigatórias desde esta fase, porque é aqui que a linguagem visual nasce. — **Reversibility:** costly — retrofitar dark mode depois exige revisitar cada cor de cada componente já construído.
- **D-17:** Personalidade **calorosa e humana**, não bancária: cantos arredondados, linguagem informal em pt-BR, cor presente sem virar enfeite. É um app de duas pessoas dividindo a vida.
- **D-18:** **Uma única linguagem visual** para os dois módulos — Financeiro e Tarefas parecem o mesmo app, muda só o conteúdo. Sem cor de destaque por módulo.
- **D-19:** O desenho visual desta fase é conduzido pela skill **`frontend-design`**, não por layout padrão de template. O shell criado aqui é a referência visual que as fases 2–6 herdam.

### Decisões de plataforma a documentar (não perguntar de novo)

- **D-20:** A `apiKey` do Firebase é **pública por design** — ela identifica o projeto, não protege dado. Quem protege são as Security Rules. Registrar isso explicitamente evita esforço de segurança mal direcionado nas fases seguintes.
- **D-21:** Conflito de escrita simultânea é **last-write-wins**, aceito conscientemente. Com dois usuários o risco é desprezível e resolver de outro jeito não se paga.
- **D-22:** Excluir a conta Google de um membro **não apaga os dados do espaço** — os lançamentos são do espaço, não da pessoa.

### Convenções transversais fixadas aqui (observáveis só a partir da Fase 2)

- **D-23:** Dinheiro é **inteiro em centavos** (`amountCents`) manipulado com Dinero.js. Float nunca calcula dinheiro. — **Reversibility:** one-way — mudar o tipo depois exige migrar todo documento financeiro já gravado.
- **D-24:** Data de calendário é `YYYY-MM-DD` explícito em **`America/Sao_Paulo`** (date-fns + `@date-fns/tz`); `Timestamp` só quando o instante importa. — **Reversibility:** one-way — a convenção errada joga lançamentos no mês errado e a correção é migração de dados.
- **D-25:** `workspaceId` fica no **path** do documento, não só como campo. É o que torna a Security Rule de isolamento simples e auditável. — **Reversibility:** one-way — mudar o path é migração de toda a base.

### Claude's Discretion

O usuário deixou explicitamente estas escolhas comigo:

- Prazo exato de expiração do convite — adotado **7 dias**
- Comprimento e alfabeto do código de convite (deve ser criptograficamente aleatório e longo o bastante para inviabilizar força bruta sem rate limiting)
- As cores concretas da paleta fixa de categorias, em versão clara e escura
- Ícone de cada categoria padrão, se houver
- Todo o desenho do modelo de dados do convite e da Security Rule que permite a entrada
- Estrutura de pastas, padrão de código e escolha entre `react-firebase-hooks` e `reactfire`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Contexto do projeto
- `.planning/PROJECT.md` — visão, core value, restrições e a tabela Key Decisions (inclui Spark sem Cloud Functions, proxy de IA externo, convite por código)
- `.planning/REQUIREMENTS.md` — os 13 requisitos desta fase (AUTH-01..07, CAT-01..04, PLAT-01, PLAT-02) e o Out of Scope explícito
- `.planning/ROADMAP.md` §"Restrições que moldam este roadmap" e §"Convenções transversais" — as restrições que superam a pesquisa, e a tabela convenção→pitfall
- `.planning/ROADMAP.md` §"Phase 1" — objetivo, 5 critérios de sucesso e notas de fase
- `.planning/STATE.md` §Blockers/Concerns — o blocker do convite sem backend

### Pesquisa do projeto
- `.planning/research/ARCHITECTURE.md` — modelo de dados Firestore com paths e campos concretos, padrão `isMember()` com `get()` nas rules, custo de leitura das regras, fronteiras dos módulos
- `.planning/research/PITFALLS.md` — pitfalls 3, 7, 8, 17 (isolamento cross-workspace, rules permissivas em dev, `workspaceId` fora do path) e o pitfall 18 (fluxo de convite/saída/exclusão de conta)
- `.planning/research/STACK.md` — versões e escolhas de Vite/React/TanStack Router/Tailwind/shadcn, e a seção "o que não usar"
- `.planning/research/SUMMARY.md` — síntese e sequência de fases conciliada

### Nota sobre a pesquisa
A `SUMMARY.md` propõe "ativar Blaze na Fase 1". Isso está **superado** por decisão do usuário — ver `.planning/ROADMAP.md` §"Restrições que moldam este roadmap", item 1. Não há Cloud Functions nesta fase nem em nenhuma outra da v1.

</canonical_refs>

<code_context>
## Existing Code Insights

Projeto greenfield — o diretório estava vazio no início desta sessão. Não há código, mapa de codebase, spikes ou sketches para reaproveitar.

### Reusable Assets
Nenhum ainda. Esta fase **cria** os ativos que as demais reaproveitam:
- O shell de navegação (barra inferior / menu lateral) — herdado pelas fases 2–6
- A paleta de cores e os tokens de tema claro/escuro — herdados por todas as telas
- Os helpers de dinheiro (centavos) e de data (fuso `America/Sao_Paulo`) — usados de fato a partir da Fase 2
- O padrão de Security Rule de isolamento por workspace — replicado em toda coleção nova

### Established Patterns
Nenhum padrão pré-existente restringe esta fase. Os padrões nascem aqui, e é por isso que as convenções D-23 a D-25 precisam estar certas na primeira tentativa: corrigi-las depois é migração de dados, não refatoração.

### Integration Points
- Firebase Auth (provedor Google) → documento de workspace no Firestore → Security Rules de todas as coleções futuras
- O shell é o ponto de integração do módulo Tarefas (Fase 6), que roda em paralelo e depende só desta fase

</code_context>

<specifics>
## Specific Ideas

- **"Manda o link no WhatsApp"** — foi assim que o usuário descreveu o convite. O fluxo deve ser otimizado para esse gesto: um toque em "convidar", link pronto para colar.
- **"Finanças já são um assunto ansioso"** — razão declarada por trás da escolha de interface espaçosa e calma. Vale como critério de julgamento quando houver dúvida de densidade em qualquer tela.
- **"É um app de duas pessoas dividindo a vida, não um sistema bancário"** — a linha que separa "caloroso e humano" de "sóbrio e confiável". Linguagem informal em pt-BR é parte disso, inclusive nos textos de erro e nos estados vazios.
- O usuário **não tem referência visual pronta** e pediu explicitamente que a interface fosse conduzida pela skill `frontend-design`. Não entregar layout genérico de framework.

</specifics>

<deferred>
## Deferred Ideas

- **Instalar como PWA na tela de início** — levantado por mim durante a análise, não pelo usuário; não está nos requisitos da Fase 1. Vale reconsiderar junto com lembretes (Fase 6), já que PWA instalado é pré-requisito de push no iOS — que também está fora da v1.
- **Sair do espaço / trocar de espaço** — o modelo suporta N membros (D-05), mas a v1 não tem fluxo de saída. Se um dia existirem múltiplos espaços por pessoa, o nome editável (D-08) já fica pronto para desambiguar.
- **Cor de destaque por módulo** — considerado e recusado (D-18) em favor de uma linguagem visual única. Registrado para não voltar por inércia.
- **Categoria para ganhos** — os requisitos definem ganho com valor, data e descrição (LANC-02), sem categoria. Se essa necessidade aparecer no uso real, é mudança de escopo da Fase 2, não desta.

</deferred>

---

*Phase: 1-Acesso e espaço compartilhado*
*Context gathered: 2026-08-27*

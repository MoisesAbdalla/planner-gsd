# Pesquisa de Features

**Domínio:** App web de controle financeiro pessoal (compartilhado a dois) + planner de tarefas do cotidiano, mercado brasileiro, com assistente de IA conversacional no lado financeiro
**Pesquisado em:** 2026-08-27
**Confiança:** MÉDIA (a maioria dos achados foi cruzada entre 2+ fontes independentes — blogs oficiais dos próprios apps, documentação de ajuda, e comparativos de terceiros; estatísticas específicas de churn/retenção e citações de UX psicológica vêm de blogs de terceiros não verificáveis e estão marcadas como BAIXA confiança onde citadas)

## Contexto de mercado

Apps analisados:
- **Brasil (finanças):** Mobills, Organizze, Minhas Economias, Nubank (recursos financeiros do app do banco), Gorila
- **Global (finanças, para contraste):** YNAB, Monarch Money, Copilot Money
- **Tarefas (global, sem forte concorrente brasileiro dedicado):** Todoist, TickTick, Google Tasks, Any.do
- **IA financeira conversacional no Brasil (categoria já validada):** assistentes financeiros via WhatsApp (Jota, ZapGastos, Focca-Ai, Financinha) — confirmam que "lançar gasto em linguagem natural" e "consultar meus gastos por conversa" já são um padrão de mercado brasileiro em produção, não uma aposta especulativa.

Nota sobre o Gorila: é uma plataforma de consolidação de **investimentos** (carteira, rentabilidade, proventos) com um chat de IA sobre a carteira — não é um app de controle de gastos/orçamento do dia a dia. É relevante aqui só como mais um exemplo do padrão "chat de IA sobre os meus dados financeiros reais", não como referência de orçamento por categoria ou parcelamento.

## Feature Landscape

### Table Stakes (o usuário espera)

Funcionalidades que, se ausentes, fazem o produto parecer incompleto ou quebrado.

| Feature | Por que é esperado | Complexidade | Notas |
|---------|--------------------|---------------|-------|
| Lançar gasto avulso (valor, data, categoria) | Ação mais básica de qualquer app financeiro; sem isso não há produto | BAIXA | Formulário simples; entrada rápida é crítica (ver Anti-Features sobre fricção) |
| Lançar receita (salário, entrada extra) | Sem entradas, "quanto sobra" não pode ser calculado | BAIXA | — |
| Contas fixas recorrentes (luz, água, aluguel, internet) com valor e vencimento, repetindo todo mês | Mobills, Organizze e Minhas Economias tratam isso como recurso central; é o "esqueleto" do mês de qualquer orçamento doméstico brasileiro | MÉDIA | Precisa gerar automaticamente a ocorrência do mês seguinte; marcar "paga" não deve exigir reentrar dados |
| Marcar conta como paga / pendente | Diferencia "o que já saiu" de "o que ainda vai sair" — base da visão de "quanto sobra" | BAIXA | Estado binário simples, mas é o que dá a sensação de controle no dia a dia |
| Categorias de gasto editáveis (mercado, transporte, lazer, saúde…) | Todos os apps estudados (BR e globais) têm categorização; é a unidade mínima de "para onde foi o dinheiro" | BAIXA-MÉDIA | Precisa vir com um conjunto padrão pt-BR sensato + permitir editar/criar |
| Compra no cartão de crédito com parcelamento (3x, 10x…) distribuído automaticamente nos meses seguintes | **Central no Brasil, não é edge case.** Mobills modela isso explicitamente: cria todas as parcelas de uma vez, distribuídas nas faturas futuras; parcelas futuras não comprometem o limite do mês corrente. Minhas Economias falha exatamente aqui (trata cartão como conta corrente comum) e isso é citado como fraqueza. | MÉDIA-ALTA | Ver seção dedicada abaixo — é o ponto técnico mais delicado do domínio |
| Visão do mês: total de entradas, total de saídas, quanto sobra | É o core value do projeto ("em 10 segundos sei quanto gastei, com o quê, e quanto sobra"); todo concorrente tem uma tela equivalente (dashboard/home) | BAIXA-MÉDIA | O que diferencia um app "que se olha" de um "que se abandona" está mais na hierarquia visual que na quantidade de dados — ver seção de Visibilidade abaixo |
| Ver gasto por categoria no mês (quanto foi gasto, quanto do teto já foi usado) | Orçamento por categoria é tabela em praticamente todos os apps (YNAB, Organizze, Copilot, Monarch); sem isso o app é só um extrato | MÉDIA | Depende de teto de orçamento por categoria (ver abaixo) |
| Teto de orçamento por categoria + indicador de estouro | Organizze descreve explicitamente "definir limites por categoria e acompanhar em tempo real"; YNAB é construído inteiramente em torno disso (orçamento base zero) | MÉDIA | Versão mínima útil: teto simples por categoria/mês + barra de progresso + estado "estourou". Não precisa de realocação entre categorias (regra "roll with the punches" do YNAB) na v1 |
| Navegar entre meses (mês anterior/próximo) | Todo app financeiro sério permite isso; sem navegação de mês o histórico não existe | BAIXA | — |
| Autenticação simples e confiável | Login quebrado = abandono imediato; todos os concorrentes têm login robusto (mesmo que via banco/e-mail) | BAIXA | Já decidido: Google via Firebase |
| Criar tarefa e marcar como concluída | Ação mínima de qualquer planner (Todoist, TickTick, Google Tasks, Any.do — todos têm isso como base) | BAIXA | — |
| Lista do dia ("o que tenho hoje") | Any.do chama isso de "My Day"; é a visão mais usada em qualquer planner do dia a dia | BAIXA-MÉDIA | É a visão que precisa carregar mais rápido e pesar menos — uso diário, muitas vezes no celular |
| Data/hora de prazo em tarefa | Sem isso não há diferença entre lista de compras e planner | BAIXA | — |
| Lembrete antes do prazo | Todoist trata isso como funcionalidade separada de "data" — lembrete é notificação, prazo é campo. TickTick, Any.do também têm | MÉDIA | Depende de push notification / permissão do navegador (web) |
| Tarefas recorrentes (toda segunda, todo dia 5…) | Padrão em Todoist, TickTick, Any.do; Google Tasks é criticado exatamente por ser mais fraco aqui | MÉDIA | Mesma lógica de recorrência que contas fixas — considerar componente compartilhado |
| Visão de semana e de mês | Google Tasks é citado como "sem visões customizadas" e isso é apontado como limitação relevante; TickTick e Todoist têm múltiplas visões (lista/board/calendário/semana) | MÉDIA | Uma lista solta cansa rápido; visão de semana é o que torna o planner usável além do primeiro dia |
| Espaço compartilhado (duas pessoas veem os mesmos dados) | Monarch Money constrói o produto inteiro em torno disso ("built specifically for households"); é decisão já tomada no PROJECT.md | MÉDIA | Ver seção dedicada de finanças compartilhadas abaixo |

### Diferenciadores (vantagem competitiva)

Funcionalidades que não são esperadas por padrão, mas alinham direto com o core value do projeto.

| Feature | Proposta de valor | Complexidade | Notas |
|---------|--------------------|---------------|-------|
| Lançamento por linguagem natural ("gastei 80 no mercado", "almoço 32 no cartão") com extração de valor/data/categoria/forma de pagamento | Elimina o maior motivo de abandono de apps financeiros: fricção de digitar formulário. Copilot Money reduziu erro de categorização para <5% após aprender com correções; o mercado brasileiro já validou esse padrão via bots de WhatsApp (Jota, ZapGastos, Financinha) — a demanda existe e é local | ALTA | Depende 100% de ter confirmação editável (ver abaixo) — sem isso vira anti-feature |
| Confirmação obrigatória do lançamento interpretado pela IA antes de gravar | É a decisão de design mais importante do produto: erro de IA que grava sozinho destrói a confiança nos números, que É o core value. Já é decisão registrada no PROJECT.md | MÉDIA | Ver "Como boas implementações lidam com erro de IA" abaixo — é diferenciador porque a maioria dos concorrentes globais (Copilot, Monarch) confirma a categorização, mas poucos expõem claramente esse fluxo de edição antes de gravar como parte central da UX |
| Consulta por linguagem natural sobre os próprios dados ("quanto gastei com comida esse mês?", "posso gastar 300?") respondendo com base nos lançamentos reais | Monarch Money descreve exatamente esse padrão: assistente de IA responde perguntas usando dados reais de transação, não resposta genérica. É o que separa "chatbot de FAQ" de "assistente que sabe seus números" | ALTA | Precisa de acesso de leitura estruturado aos lançamentos do mês/categoria — não é geração livre, é grounding nos dados do Firestore |
| Modelo de fatura de cartão realista (data de fechamento vs. vencimento, parcela cai na fatura certa) | Nenhum concorrente brasileiro estudado modela isso de forma perfeita e visível ao usuário (Minhas Economias erra feio aqui); acertar isso é diferenciação técnica silenciosa que evita frustração recorrente | ALTA | Ver seção dedicada abaixo |
| Visão "o que ainda vai vencer no mês vs. o que já foi pago" | Já é requisito ativo no PROJECT.md; nenhum concorrente estudado combina isso com IA conversacional na mesma tela | MÉDIA | Reforça o core value de "10 segundos" — é a pergunta seguinte natural depois de "quanto sobra" |
| Espaço compartilhado simples (mesmo mês, mesmos lançamentos, sem papéis/permissões) | Monarch cobra por isso como feature premium ($99/ano); aqui é grátis por decisão de escopo (2 pessoas conhecidas). Simplicidade é o diferencial, não recursos extras de colaboração | BAIXA-MÉDIA | Deliberadamente mais simples que Monarch/apps de "dividir contas" — ver Anti-Features |

### Anti-Features (parecem boas, mas são armadilha)

| Feature | Por que é pedida | Por que é problemática | Alternativa |
|---------|-------------------|--------------------------|-------------|
| Importar extrato bancário via Open Finance (agregador tipo Pluggy/Belvo) | Parece "o app definitivo" — zero digitação, sincroniza sozinho | Exige contrato pago com agregador, aprovação de compliance, tratamento de erro de sincronização bancária, e é citado como ponto frágil de onboarding ("perde usuário no momento de maior confiança exigida"). Custo recorrente desproporcional para uso a 2 pessoas. Já é decisão de escopo do usuário: v2 | Lançamento manual + lançamento por IA conversacional cobre 90% do valor sem o custo/risco de integração bancária |
| OCR de comprovante de Pix/nota fiscal por foto | Parece reduzir fricção de digitação a zero | Tecnicamente viável (IA multimodal), mas não é o caminho crítico para "saber quanto sobra" — é conveniência incremental sobre um problema (digitar) que a IA conversacional por texto já resolve razoavelmente bem. Risco de OCR errado é maior que erro de interpretação de texto (imagem borrada, nota fiscal com formato variável) | IA conversacional por texto cobre o caso de uso principal; OCR fica para v2 quando o texto já estiver validado em produção |
| Dividir despesas / "quem pagou o quê" / acerto de contas (settle-up) tipo Splitwise | Parece natural para "casal compartilhando contas" | É uma categoria de produto inteira à parte (Splitwise, Fikko, dividi — apps dedicados a isso), com lógica de saldo devedor entre pessoas, histórico de "quem deve quem", e frequentemente gera atrito emocional em vez de resolvê-lo. O PROJECT.md já decidiu: é orçamento **compartilhado**, não **dividido** — as duas pessoas veem o mesmo mês, não saldos individuais | Espaço compartilhado simples: um lançamento pertence ao mês do casal, ponto final. Sem conceito de "de quem é a dívida" |
| IA conversacional também para tarefas | Parece consistência de produto ("já que financeiro tem IA, por que não tarefas?") | Dilui o foco de onde a dor é maior (financeiro) e onde a IA realmente resolve um problema difícil (extrair valor/categoria/data de texto livre). Em tarefas, formulário simples já é rápido o suficiente — não há o mesmo ganho. Já é decisão explícita de escopo no PROJECT.md | IA prova valor no financeiro primeiro; se validar, expandir para tarefas depois com aprendizado real de uso |
| Gamificação pesada (streaks, badges, "não quebre sua sequência") | Apps de produtividade/hábito usam isso para reter usuário | Para dado financeiro sensível, tom punitivo ou de jogo ("não quebre sua sequência de economia!") tende a soar infantilizante ou gerar culpa; pesquisa de UX de apps de orçamento aponta que alertas paternalistas geram ressentimento, não fidelidade | Alertas de suporte, neutros e objetivos ("você está perto do teto — quer ajustar a categoria ou seguir assim?"), sem mecânica de jogo |
| Metas de poupança e investimentos dentro do mesmo app | Parece natural expandir de "para onde foi o dinheiro" para "onde investir" | Já decidido como fora de escopo no PROJECT.md — é uma categoria de produto diferente (Gorila, corretoras) com necessidades de dado totalmente diferentes (cotação, rentabilidade, risco). Fora do foco do core value | Nenhuma — mantido fora de escopo mesmo em v2, a menos que o core value do produto mude |
| Multiplataforma nativa (app iOS/Android separado) desde a v1 | Parece "mais profissional" | Duplica esforço de manutenção sem validar primeiro se o produto (2 usuários) precisa de app nativo; PWA/web responsiva resolve os dois contextos de uso (fila do mercado no celular, organizar o mês no desktop) com uma base só | Web responsiva única, já decidida |
| Login por e-mail/senha como alternativa ao Google | Parece dar "mais opções" | Cada método de auth adicional é superfície de manutenção: recuperação de senha, verificação de e-mail, hashing, rate limiting de tentativa de login. Para 2 usuários conhecidos, é custo sem benefício real | Login único via Google/Firebase, já decidido |
| Categorização 100% automática sem confirmação (IA grava direto) | Parece "mágico" e reduz clique | Todo achado de pesquisa aponta o mesmo risco: erro de categorização/interpretação da IA destrói a confiança do usuário nos números logo na primeira semana — e números são exatamente o core value do produto. Mesmo apps maduros como Copilot (que aprendeu e caiu para <5% de erro) ainda deixam tudo editável | Confirmação obrigatória antes de gravar (já decidido no PROJECT.md) + edição sempre disponível depois |
| Notificar tudo (todo lançamento, todo estouro, todo vencimento, toda sugestão da IA) | Parece "manter o usuário informado" | Excesso de notificação cansa e é citado como fator de abandono; hierarquia mal pensada faz o usuário silenciar o app inteiro | Poucos alertas essenciais: conta prestes a vencer, categoria estourada, e ponto final — sem notificação para cada lançamento normal |

## Análise aprofundada por área

### 1. Registro financeiro — o parcelamento é o ponto técnico central

O padrão brasileiro de fatura de cartão tem duas datas que definem tudo: **fechamento** (encerra o ciclo de compras daquele mês) e **vencimento** (prazo de pagamento). Uma compra feita **depois** do fechamento só entra na fatura seguinte — o "efeito dos 40 dias" citado nas fontes: compra no dia do fechamento pode escorregar quase 40 dias até o vencimento da fatura em que efetivamente cai.

Como Mobills modela isso (referência direta para o v1):
- Ao lançar uma compra parcelada (ex: R$ 900 em 3x), o app cria as 3 parcelas de uma vez, cada uma associada à fatura do mês correspondente (parcela 1 na fatura corrente ou próxima, dependendo da data de fechamento; parcelas 2 e 3 nos meses seguintes).
- As parcelas futuras aparecem no "previsto" dos meses seguintes, mas **não comprometem o limite disponível do mês atual** — isso é o detalhe que Minhas Economias erra ao tratar cartão como conta corrente comum.
- O usuário consegue ver, navegando entre meses, quanto de fatura futura já está comprometido por parcelamentos em andamento.

Implicação de modelagem de dados: uma "compra parcelada" não é um lançamento — é um lançamento-pai com N lançamentos-filho, cada um datado no mês da fatura correspondente, e a soma do pai deve ser rastreável (para permitir editar/excluir a compra inteira, não só uma parcela solta).

Contas fixas recorrentes são mais simples: repetição mensal automática do mesmo valor e categoria, com estado pago/pendente por mês — não precisam de lógica de fatura, só de "próxima ocorrência".

### 2. Visibilidade financeira — o que faz a diferença entre "abrir todo dia" e "abandonar em 30 dias"

A pesquisa é consistente: a maior causa de abandono de app financeiro não é falta de recurso, é **fricção de manutenção manual** — "apps que exigem entrada manual perdem usuário a uma taxa 3x maior que apps com sincronização automática" e a maioria dos apps de orçamento tem churn de 96-98% em 30 dias (dado de blog terceiro, confiança BAIXA, mas direção do achado é consistente em múltiplas fontes independentes).

Como este produto não terá sincronização bancária automática na v1 (Open Finance é v2 explícito), a única forma de neutralizar essa fricção é o **lançamento por IA conversacional** ser mais rápido que abrir um formulário — essa é a aposta central do produto e por que a IA não é opcional na v1.

Para a tela de visão do mês, o padrão que se repete nos apps bem avaliados (Organizze, Copilot, Monarch) não é "mostrar tudo", é hierarquia clara:
1. Um número: quanto sobra (entradas − saídas − comprometido)
2. Logo abaixo: por categoria, quanto já foi gasto vs. teto
3. Separado: o que ainda vai vencer vs. o que já foi pago

Isso bate exatamente com os requisitos já ativos no PROJECT.md — a pesquisa confirma que essa é a ordem certa de prioridade visual, não uma lista de widgets soltos.

### 3. Orçamento por categoria — versão mínima útil

YNAB é o caso extremo (orçamento base zero: cada real tem que ter um "trabalho" antes de ser gasto) — é poderoso mas pesado, e não é o que este produto precisa na v1. Organizze e Copilot representam a versão mais simples e ainda assim útil: **teto por categoria + acompanhamento em tempo real + indicador de estouro**.

Versão mínima recomendada para v1 (já alinhada ao PROJECT.md):
- Definir um valor de teto por categoria por mês
- Mostrar gasto acumulado da categoria vs. teto (barra de progresso)
- Indicar visualmente quando estourou

Não incluir na v1: realocação entre categorias (mover R$50 de "lazer" para "mercado"), metas de categoria de longo prazo, ou orçamento "base zero" onde toda a renda precisa ser alocada — isso é a diferença entre YNAB (pesado) e Organizze (leve), e o produto deve mirar no segundo.

### 4. IA conversacional em finanças — o que existe hoje e como não perder a confiança

O mercado brasileiro já tem essa categoria validada e em produção fora do escopo de apps tradicionais: assistentes financeiros dentro do WhatsApp (Jota, ZapGastos, Focca-Ai, Financinha) que entendem "gastei 150 no supermercado" ou "recebi 3 mil de salário" em linguagem coloquial, incluindo gírias locais. Isso confirma que a demanda por lançamento conversacional em pt-BR é real e testada no mercado brasileiro — não é uma hipótese a validar do zero.

Do lado dos apps globais mais maduros (Copilot Money, Monarch Money), o padrão de confiança que se repete:
- A IA **sempre** categoriza/interpreta, mas o dado **sempre** permanece editável depois — nunca é "gravado e travado".
- Copilot Money aprende com as correções do usuário ao longo do tempo (a taxa de erro caiu de patamares comparáveis ao Mint, ~15-20%, para <5% depois de poucas semanas de uso) — ou seja, mesmo com aprendizado, o produto não elimina a necessidade de correção, só reduz a frequência.
- Monarch Money ancora as respostas do assistente em dados reais de transação do usuário (não resposta genérica de LLM) — esse é o padrão a seguir para "quanto gastei com comida esse mês?": a resposta tem que vir de uma consulta estruturada aos lançamentos reais, com o texto da IA como camada de apresentação, não como fonte de verdade.

Padrão de UX que emerge como consenso (e já está capturado como decisão no PROJECT.md): **a IA nunca grava um lançamento sem confirmação explícita do usuário.** O fluxo correto é: usuário escreve em linguagem natural → IA extrai valor/data/categoria/forma de pagamento e mostra um preview claramente editável → usuário confirma ou corrige campo a campo → só então grava. Isso é o que separa um assistente que gera confiança de um que a destrói na primeira interpretação errada — e interpretação errada é estatisticamente inevitável em linguagem natural, então o produto precisa ser desenhado assumindo que vai acontecer, não torcendo para que não aconteça.

### 5. Finanças compartilhadas — o mínimo certo vs. a armadilha de complexidade

Existem dois modelos totalmente diferentes de produto que é fácil confundir:

**Modelo A — Orçamento compartilhado (o que este produto precisa):** duas pessoas enxergam e lançam no mesmo mês, mesmos dados, sem conceito de "de quem é o quê". Monarch Money é a referência: login próprio por parceiro, mas um dashboard compartilhado em tempo real. Isso é exatamente o que o PROJECT.md já define ("mesmo mês, mesmos lançamentos").

**Modelo B — Divisão de despesas / acerto de contas (armadilha, categoria de produto separada):** apps como Splitwise, Fikko e "dividi" existem inteiramente para resolver "quem pagou o quê e quanto cada um deve ao outro" — exige lógica de saldo devedor entre pessoas, histórico de acerto, e frequentemente é fonte de atrito, não alívio. É um produto genuinamente diferente.

O padrão de mercado brasileiro para casais (achado consistente em múltiplas fontes) é o "modelo híbrido": conta/orçamento conjunto para despesas da casa (cada um contribui um valor combinado) + gastos pessoais ficam fora. Isso reforça a decisão correta do PROJECT.md: o espaço compartilhado deve ser um **orçamento único do casal**, sem rastrear "de quem" foi cada lançamento nem calcular saldo entre as duas pessoas — a complexidade de settle-up é exatamente o que deve ficar fora do escopo.

### 6. Planner de tarefas — o mínimo que se usa todo dia

Cruzando os quatro apps estudados, o padrão do que separa "planner que se abre todo dia" de "lista que se esquece" não é quantidade de recursos, é:
1. Uma visão de "hoje" rápida de carregar e de entender (Any.do "My Day")
2. Prazo com hora, não só data, quando fizer sentido (evita "vencimento vago")
3. Lembrete configurável antes do prazo — sem isso o planner é só um repositório passivo
4. Recorrência simples via texto/seleção ("toda segunda", "todo dia 5") — Todoist e TickTick tratam isso como recurso de primeira classe
5. Visão de semana como ponte entre "hoje" e "mês" — Google Tasks é citado repetidamente como limitado justamente por não ter isso

O que **não** é necessário no mínimo viável (evitar seguir TickTick até o fim): Pomodoro, habit tracker com heat map, boards estilo kanban, subtarefas com dependência. Esses são recursos de um produto de produtividade mais amplo, não de um planner do cotidiano — e cada um deles é uma categoria de complexidade própria (temporizador, lógica de streak, drag-and-drop de board) que não serve ao core value do projeto.

## Feature Dependencies

```
Lançar gasto avulso
    └──requires──> Categorias de gasto editáveis

Compra parcelada no cartão
    └──requires──> Categorias de gasto editáveis
    └──requires──> Modelo de fatura (fechamento/vencimento) por cartão
    └──enhances──> Visão "o que ainda vai vencer vs. já pago"

Contas fixas recorrentes
    └──requires──> Categorias de gasto editáveis
    └──enhances──> Visão "o que ainda vai vencer vs. já pago"

Teto de orçamento por categoria
    └──requires──> Categorias de gasto editáveis
    └──requires──> Lançamentos (avulso + cartão + contas fixas) já somando por categoria/mês

Visão do mês (entradas, saídas, sobra)
    └──requires──> Lançar gasto avulso
    └──requires──> Lançar receita
    └──requires──> Compra parcelada no cartão (para não subestimar comprometido futuro)
    └──requires──> Contas fixas recorrentes

Lançamento por IA conversacional
    └──requires──> Categorias de gasto editáveis (a IA precisa mapear texto → categoria existente)
    └──requires──> Confirmação/edição antes de gravar
    └──enhances──> Lançar gasto avulso, Registrar compra no cartão (é uma segunda porta de entrada para os mesmos dados, não um recurso paralelo)

Consulta por IA conversacional ("quanto gastei com comida?")
    └──requires──> Visão do mês (a IA precisa de dados já agregados/consultáveis por categoria e período)
    └──requires──> Teto de orçamento por categoria (para responder "posso gastar 300?")

Espaço compartilhado
    └──requires──> Autenticação (Firebase/Google)
    └──enhances──> todos os itens financeiros acima (mesmo dado, duas pessoas)

Tarefa recorrente ──shares-pattern-with──> Conta fixa recorrente (mesma lógica de "próxima ocorrência")

Divisão de despesas (settle-up) ──conflicts──> Espaço compartilhado simples
    (settle-up exige rastrear "de quem" é cada lançamento; espaço compartilhado deliberadamente não rastreia isso)
```

### Notas de dependência

- **Compra parcelada requer modelo de fatura:** sem definir fechamento/vencimento por cartão, não há como decidir em qual mês cada parcela cai — é a peça de dado que precisa existir antes de a feature de parcelamento funcionar corretamente, não pode ser adicionada depois "por cima".
- **Teto de orçamento requer lançamentos já agregando por categoria/mês:** a soma de gasto por categoria é pré-requisito de dado, não é opcional construir depois — o teto sem soma correta é decoração.
- **IA de lançamento e IA de consulta dependem uma da outra em maturidade, mas não tecnicamente:** lançar por conversa pode existir sem consulta por conversa (e vice-versa) no código, mas o valor do produto descrito no PROJECT.md exige as duas juntas — a consulta só é útil se os dados que ela lê vieram majoritariamente de lançamentos reais, e o lançamento por conversa só prova valor se o usuário depois consegue perguntar sobre o que lançou.
- **Divisão de despesas conflita com espaço compartilhado simples:** são dois modelos de dado incompatíveis (rastrear "de quem" vs. não rastrear) — por isso está corretamente fora de escopo, não é "fácil adicionar depois" sem redesenhar o modelo de lançamento.

## MVP Definition

### Lançar com (v1) — já reflete o que está em PROJECT.md, validado pela pesquisa

- [ ] Login Google (Firebase) + espaço compartilhado isolado por regras do Firestore — sem isso não há produto multiusuário seguro
- [ ] Categorias de gasto editáveis (conjunto padrão pt-BR + criar/editar) — pré-requisito de tudo mais
- [ ] Lançar gasto avulso (valor, data, categoria) e receita — ação mínima de qualquer app financeiro
- [ ] Contas fixas recorrentes com marcação de pago/pendente — esqueleto do mês
- [ ] Compra no cartão com parcelamento modelado por fatura (fechamento/vencimento), distribuindo parcelas nos meses corretos sem comprometer limite do mês atual incorretamente — é o ponto onde os concorrentes brasileiros mais erram; acertar aqui é o diferencial técnico da v1
- [ ] Teto de orçamento por categoria + indicador visual de estouro — versão simples (sem realocação entre categorias)
- [ ] Visão do mês: entradas, saídas, sobra, gasto por categoria vs. teto, o que vence vs. já foi pago, navegação entre meses — é literalmente o core value do produto
- [ ] Lançamento por IA conversacional com preview editável e confirmação obrigatória antes de gravar — sem isso a fricção de digitação mata a retenção, conforme toda a pesquisa de churn
- [ ] Consulta por IA conversacional ancorada nos dados reais do mês — completa o par "lançar por conversa / perguntar por conversa" que o PROJECT.md marca como igualmente essencial
- [ ] Tarefas: criar, concluir, lista do dia, prazo com data/hora, lembrete, recorrência simples, visão de semana e mês — planner mínimo que se usa todo dia, sem virar produto de produtividade completo

### Adicionar após validação (v1.x)

- [ ] Antecipação/ajuste manual de parcela (ex: quitar parcelas futuras antecipadamente) — comum no Brasil, mas não bloqueia o core value inicial
- [ ] Relatório/gráfico de evolução de gasto por categoria ao longo de vários meses — só faz sentido depois de meses de dado real acumulado
- [ ] Ajuste fino do tom/alertas de estouro de orçamento (mensagens de suporte vs. neutras) com base em uso real do casal

### Consideração futura (v2+) — já decidido no PROJECT.md, reforçado pela pesquisa

- [ ] Importação de extrato bancário via Open Finance — exige agregador pago (Pluggy/Belvo); pesquisa confirma que integração bancária frágil é justamente onde apps perdem usuário na confiança, então vale nascer validado sem essa dependência primeiro
- [ ] OCR de comprovante/nota fiscal por foto — tecnicamente viável, mas conveniência incremental sobre um problema que a IA conversacional por texto já ataca
- [ ] IA conversacional em tarefas — deliberadamente adiado até a IA provar valor no financeiro

## Feature Prioritization Matrix

| Feature | Valor para o usuário | Custo de implementação | Prioridade |
|---------|------------------------|---------------------------|----------|
| Visão do mês (entradas/saídas/sobra) | ALTO | MÉDIO | P1 |
| Compra parcelada com modelo de fatura correto | ALTO | ALTO | P1 |
| Lançamento por IA conversacional + confirmação | ALTO | ALTO | P1 |
| Consulta por IA conversacional | ALTO | ALTO | P1 |
| Contas fixas recorrentes | ALTO | MÉDIO | P1 |
| Categorias editáveis | ALTO | BAIXO | P1 |
| Teto de orçamento por categoria (versão simples) | ALTO | MÉDIO | P1 |
| Espaço compartilhado (2 pessoas, mesmo dado) | ALTO | MÉDIO | P1 |
| Planner de tarefas (dia, prazo, lembrete, recorrência, semana/mês) | MÉDIO-ALTO | MÉDIO | P1 |
| Antecipação manual de parcela | MÉDIO | BAIXO-MÉDIO | P2 |
| Gráficos de evolução multi-mês | MÉDIO | MÉDIO | P2 |
| Realocação entre categorias de orçamento (estilo YNAB) | BAIXO-MÉDIO | MÉDIO | P3 |
| Importação Open Finance | ALTO (a longo prazo) | ALTO | P3 (v2 explícito) |
| OCR de comprovante/nota | MÉDIO | ALTO | P3 (v2 explícito) |
| IA conversacional em tarefas | BAIXO (na v1) | MÉDIO | P3 (v2 explícito) |
| Divisão de despesas / settle-up | BAIXO (conflita com decisão de escopo) | ALTO | Fora de escopo |

**Chave de prioridade:**
- P1: essencial para o lançamento
- P2: desejável, adicionar quando possível
- P3: bom ter, consideração futura

## Competitor Feature Analysis

| Feature | Mobills (BR) | Monarch Money (Global) | Nossa abordagem |
|---------|--------------|--------------------------|-------------------|
| Parcelamento no cartão | Cria todas as parcelas automaticamente, distribui nas faturas futuras, não compromete limite do mês atual | Não é o foco (mercado americano tem cultura de crédito diferente, sem "parcelamento" como conceito central) | Seguir o padrão Mobills como referência direta — é o ponto mais crítico da v1 |
| IA conversacional | Sem IA conversacional nativa para lançamento/consulta | Assistente de IA responde perguntas em linguagem natural ancorado em dados reais de transação | Combinar os dois: lançar E consultar por conversa, algo que nenhum dos dois oferece junto hoje |
| Orçamento compartilhado | Sincronização em nuvem entre pessoas do ambiente familiar | Login próprio por parceiro + dashboard compartilhado em tempo real, com tag pessoal/compartilhado | Mais simples que os dois: mesmo mês, mesmos lançamentos, sem tags de pessoal/compartilhado nem papéis — apenas os dois veem tudo |
| Teto de orçamento por categoria | Sim, com acompanhamento (via Organizze/Mobills) | Sim, com relatórios avançados | Versão mínima: teto + progresso + estourou, sem realocação nem metas de longo prazo |
| Preço | R$19,90/mês (assinatura) | US$99,99/ano (~R$580/ano) | Não é SaaS — uso pessoal de 2 pessoas conhecidas, sem modelo de cobrança (já decidido) |

## Sources

- [Mobills — Central de Ajuda: transação parcelada no cartão](https://mobills.zendesk.com/hc/pt-br/articles/44243003508123-Como-criar-uma-transa%C3%A7%C3%A3o-parcelada-no-cart%C3%A3o-de-cr%C3%A9dito-manual)
- [Mobills — Parcelamento da fatura do cartão de crédito](https://www.mobills.com.br/blog/cartao-de-credito/parcelamento-da-fatura-do-cartao-de-credito/)
- [Mobills — Os 7 melhores apps de finanças compartilhadas](https://www.mobills.com.br/blog/educacao-financeira/financas-compartilhadas/)
- [Organizze — App controle de gastos cartão de crédito](https://www.organizze.com.br/blog/controle-de-gastos/app-controle-de-gastos-cartao-de-credito)
- [Organizze — Ajuda: fatura dos cartões de crédito](https://ajuda.organizze.com.br/hc/pt-br/articles/360035804574-Android-Vis%C3%A3o-geral-Fatura-dos-cart%C3%B5es-de-cr%C3%A9dito)
- [Minhas Economias — Como funciona](https://minhaseconomias.com.br/como-funciona)
- [iDinheiro — Minhas Economias, controle seus gastos](https://www.idinheiro.com.br/financaspessoais/minhas-economias/)
- [Tecnoblog — Como funciona o Nubank](https://tecnoblog.net/responde/como-funciona-o-nubank-conheca-os-recursos-do-aplicativo-do-banco-digital/)
- [Oficina da Net — Organizar gastos por categoria no app Nubank](https://www.oficinadanet.com.br/bancos-digitais/29642-como-organizar-seus-gastos-por-categoria-personalizada-no-app-nubank)
- [Gorila — investimentos com IA](https://apps.apple.com/br/app/gorila-investimentos-e-a%C3%A7%C3%B5es/id1447950043)
- [YNAB — What Is Zero-Based Budgeting](https://www.ynab.com/blog/what-is-a-zero-based-budget)
- [Monarch Money — AI in Monarch](https://help.monarch.com/hc/en-us/articles/37526856682260-AI-in-Monarch)
- [Monarch Money — About Monarch's AI Features](https://help.monarch.com/hc/en-us/articles/16116906962452-About-Monarch-s-AI-Features)
- [The College Investor — Copilot Money Review 2026](https://thecollegeinvestor.com/41976/copilot-review/)
- [Todoist — Introduction to recurring dates](https://www.todoist.com/help/articles/introduction-to-recurring-dates-YUYVJJAV)
- [Todoist — Introduction to reminders](https://www.todoist.com/help/articles/introduction-to-reminders-9PezfU)
- [TickTick — site oficial e guia](https://www.ticktick.com/)
- [TasksBoard — Google Tasks Review 2026](https://tasksboard.com/blog/google-tasks-review)
- [Android Authority — I switched from Todoist to Google Tasks](https://www.androidauthority.com/i-ditched-todoist-from-google-tasks-3635478/)
- [Any.do — Daily Planner](https://www.any.do/daily-planner/)
- [Mercado Pago — Data de vencimento e fechamento da fatura](https://www.mercadopago.com.br/blog/data-de-vencimento-fechamento-fatura-do-cartao)
- [Serasa — Data de vencimento e fechamento da fatura](https://www.serasa.com.br/blog/data-de-vencimento-e-fechamento-da-fatura-qual-e-a-diferenca/)
- [zapgastos.com — assistente financeiro no WhatsApp](https://zapgastos.com/)
- [Financinha — assistente financeiro com IA no WhatsApp](https://www.financinha.com.br/)
- [Focca-Ai — IA financeira no WhatsApp](https://focca-ai.com/ia-financeira-whatsapp)
- [CNBC Select — Mint is gone, alternativas](https://www.cnbc.com/select/mint-budgeting-app-is-going-away-here-are-some-alternatives/)
- [Monarch — Mint is shutting down, thoughts](https://www.monarch.com/blog/mint-shutting-down)
- [SpendTrak — Why People Quit Budgeting Apps in 30 Days (confiança BAIXA — blog terceiro, estatística não verificada em fonte primária)](https://spendtrak.app/blog/why-people-quit-budgeting-apps)
- [Appthetics — Budgeting Apps UX Patterns (confiança BAIXA — blog terceiro)](https://www.appthetics.com/blog/budgeting-apps-ux-patterns)
- Assistente financeiro via WhatsApp no Brasil (Jota, ZapGastos, Focca-Ai, Financinha) — validação de mercado de que lançamento/consulta conversacional em pt-BR já é categoria em produção

---
*Feature research for: app de finanças pessoais compartilhadas + planner de tarefas, mercado brasileiro*
*Researched: 2026-08-27*

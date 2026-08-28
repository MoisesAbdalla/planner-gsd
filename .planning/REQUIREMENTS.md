# Requirements: Cotidiano

**Defined:** 2026-08-27
**Core Value:** Em 10 segundos eu sei quanto gastei, com o quê, e quanto sobra no mês.

## v1 Requirements

Requisitos da primeira versão. Cada um mapeia para uma fase do roadmap.

### Plataforma

- [ ] **PLAT-01**: Interface, datas e valores aparecem em português brasileiro com moeda R$
- [ ] **PLAT-02**: Todas as telas são usáveis no celular e no desktop sem rolagem horizontal
- [ ] **PLAT-03**: A soma das parcelas de uma compra parcelada é sempre exatamente igual ao valor total da compra, em qualquer número de parcelas de 2x a 24x
- [ ] **PLAT-04**: Um lançamento feito em qualquer horário do dia aparece no dia e no mês corretos, sem desvio de fuso horário

### Autenticação e espaço compartilhado

- [x] **AUTH-01**: Usuário entra no app com sua conta Google
- [x] **AUTH-02**: Usuário sai da conta
- [x] **AUTH-03**: No primeiro login, um espaço compartilhado é criado com o usuário como membro
- [ ] **AUTH-04**: Usuário gera um código de convite para o seu espaço
- [ ] **AUTH-05**: Segunda pessoa entra no espaço colando o código de convite
- [ ] **AUTH-06**: Membros do mesmo espaço veem os mesmos lançamentos, contas, orçamentos e tarefas
- [x] **AUTH-07**: Usuário de um espaço não consegue ler nem escrever dados de outro espaço

### Categorias

- [ ] **CAT-01**: Espaço novo já nasce com um conjunto de categorias padrão em português
- [ ] **CAT-02**: Usuário cria uma categoria
- [ ] **CAT-03**: Usuário edita o nome e a cor de uma categoria
- [ ] **CAT-04**: Usuário arquiva uma categoria sem perder os lançamentos já feitos nela

### Lançamentos

- [ ] **LANC-01**: Usuário lança um gasto avulso com valor, data e categoria
- [ ] **LANC-02**: Usuário lança um ganho com valor, data e descrição
- [ ] **LANC-03**: Usuário edita um lançamento existente
- [ ] **LANC-04**: Usuário exclui um lançamento
- [ ] **LANC-05**: Usuário vê a lista de lançamentos do mês

### Visão mensal

- [ ] **MES-01**: Usuário vê o total de entradas, o total de saídas e quanto sobra no mês
- [ ] **MES-02**: Usuário vê quanto gastou em cada categoria no mês
- [ ] **MES-03**: Usuário navega para o mês anterior e para o próximo
- [ ] **MES-04**: A tela do mês já abre mostrando o saldo, sem exigir clique adicional nem seleção de filtro

### Contas fixas

- [ ] **FIXA-01**: Usuário cadastra uma conta fixa mensal com nome, valor e dia de vencimento
- [ ] **FIXA-02**: A conta fixa aparece automaticamente em cada mês seguinte quando o mês é acessado
- [ ] **FIXA-03**: Usuário marca uma conta como paga naquele mês
- [ ] **FIXA-04**: Usuário vê o que ainda vai vencer e o que já foi pago no mês
- [ ] **FIXA-05**: Conta fixa com vencimento em dia que não existe no mês (dia 31 em fevereiro) cai no último dia do mês
- [ ] **FIXA-06**: Usuário edita ou encerra uma conta fixa sem alterar meses já passados

### Cartão de crédito e parcelas

- [ ] **CART-01**: Usuário cadastra um cartão com data de fechamento e data de vencimento
- [ ] **CART-02**: Usuário lança uma compra no cartão
- [ ] **CART-03**: Compra feita depois da data de fechamento entra na fatura do mês seguinte
- [ ] **CART-04**: Usuário lança uma compra parcelada informando o número de parcelas
- [ ] **CART-05**: As parcelas são distribuídas uma por mês nos meses seguintes, geradas quando o mês é acessado
- [ ] **CART-06**: O gasto do cartão é contabilizado no mês da compra — cada parcela pertence ao mês em que cai
- [ ] **CART-07**: Usuário vê o total da fatura de cada mês

### Orçamento

- [ ] **ORCA-01**: Usuário define um teto de gasto para uma categoria no mês
- [ ] **ORCA-02**: Usuário vê quanto já usou do teto de cada categoria
- [ ] **ORCA-03**: Usuário percebe visualmente quando o teto de uma categoria foi estourado

### Assistente de IA

- [ ] **IA-01**: Usuário descreve um gasto em linguagem natural ("gastei 80 no mercado") e recebe uma proposta de lançamento estruturada
- [ ] **IA-02**: A proposta mostra o valor, a data, a categoria e a forma de pagamento que a IA interpretou
- [ ] **IA-03**: Usuário edita qualquer campo da proposta antes de confirmar
- [ ] **IA-04**: Nenhum lançamento é gravado sem confirmação explícita do usuário
- [ ] **IA-05**: Usuário pergunta sobre os próprios gastos ("quanto gastei com comida esse mês?") e recebe resposta calculada a partir dos lançamentos reais do espaço
- [ ] **IA-06**: A IA conversa em português brasileiro e entende linguagem coloquial
- [ ] **IA-07**: A chave da API do provedor de IA nunca chega ao navegador
- [ ] **IA-08**: A IA só acessa dados do espaço do usuário autenticado, mesmo que o texto digitado peça outra coisa

### Tarefas

- [ ] **TAR-01**: Usuário cria uma tarefa
- [ ] **TAR-02**: Usuário marca uma tarefa como concluída
- [ ] **TAR-03**: Usuário vê as tarefas do dia
- [ ] **TAR-04**: Usuário define data e hora de prazo para uma tarefa
- [ ] **TAR-05**: Usuário é lembrado da tarefa dentro do app antes do prazo
- [ ] **TAR-06**: Usuário cria uma tarefa recorrente (toda segunda, todo dia 5)
- [ ] **TAR-07**: Usuário vê as tarefas da semana e do mês
- [ ] **TAR-08**: Usuário edita e exclui uma tarefa

## v2 Requirements

Reconhecidos mas adiados. Não entram no roadmap atual.

### Importação

- **IMP-01**: Usuário importa o extrato bancário automaticamente via Open Finance
- **IMP-02**: Usuário fotografa um comprovante ou Pix e a IA extrai o lançamento
- **IMP-03**: Usuário reconcilia lançamentos importados com os que já havia digitado

### Notificações

- **NOTF-01**: Usuário recebe notificação push de tarefa mesmo com o app fechado
- **NOTF-02**: Usuário recebe aviso de conta prestes a vencer
- **NOTF-03**: Usuário configura quais avisos quer receber

### Assistente ampliado

- **IAX-01**: Usuário cria e consulta tarefas por conversa
- **IAX-02**: A IA aponta padrões de gasto sem ser perguntada
- **IAX-03**: Usuário lança vários gastos numa única frase

### Financeiro avançado

- **FINX-01**: Usuário antecipa parcelas futuras de uma compra
- **FINX-02**: Usuário transfere valor entre contas/carteiras
- **FINX-03**: Usuário vê a evolução do gasto por categoria ao longo dos meses
- **FINX-04**: Contas fixas dos meses futuros são materializadas por rotina agendada, sem depender de abrir o app

## Out of Scope

Excluído explicitamente, com o motivo, para impedir que volte por inércia.

| Feature | Reason |
|---------|--------|
| Cloud Functions / plano Blaze do Firebase | O usuário optou por não cadastrar cartão no Google Cloud; o plano Spark não deploya funções |
| Rotina agendada (cron) para gerar meses futuros | Consequência direta de não ter Blaze — ocorrências são geradas quando o mês é acessado |
| Notificação push (FCM) | Depende de rotina agendada; no iOS Safari ainda exigiria PWA instalado. Lembrete da v1 é dentro do app |
| Divisão de despesas e acerto de contas (settle-up) | Categoria de produto separada (Splitwise, Fikko); conflita com o modelo simples de espaço compartilhado |
| Papéis, permissões e convites em massa | O espaço é para duas pessoas conhecidas — não é SaaS multi-tenant |
| Login por e-mail e senha | Google via Firebase basta e evita construir cadastro, recuperação e verificação |
| App nativo iOS/Android | Web responsiva cobre os dois contextos com uma base de código só |
| Metas de poupança e investimentos | O app responde "para onde foi o dinheiro", não "onde aplicar" |
| Múltiplas moedas | Uso pessoal no Brasil; multi-moeda multiplica a complexidade de todo cálculo |
| Integração automática tarefas ↔ finanças | Decisão do usuário: os módulos convivem, mas não se acoplam na v1 |
| RAG com embeddings para consulta financeira | Dado financeiro exige o número exato; busca semântica aproxima e destrói o core value |

## Traceability

Preenchido durante a criação do roadmap (2026-08-27).

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 3 | Pending |
| PLAT-04 | Phase 2 | Pending |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 1 | Pending |
| AUTH-07 | Phase 1 | Complete |
| CAT-01 | Phase 1 | Pending |
| CAT-02 | Phase 1 | Pending |
| CAT-03 | Phase 1 | Pending |
| CAT-04 | Phase 1 | Pending |
| LANC-01 | Phase 2 | Pending |
| LANC-02 | Phase 2 | Pending |
| LANC-03 | Phase 2 | Pending |
| LANC-04 | Phase 2 | Pending |
| LANC-05 | Phase 2 | Pending |
| MES-01 | Phase 2 | Pending |
| MES-02 | Phase 2 | Pending |
| MES-03 | Phase 2 | Pending |
| MES-04 | Phase 2 | Pending |
| CART-01 | Phase 3 | Pending |
| CART-02 | Phase 3 | Pending |
| CART-03 | Phase 3 | Pending |
| CART-04 | Phase 3 | Pending |
| CART-05 | Phase 3 | Pending |
| CART-06 | Phase 3 | Pending |
| CART-07 | Phase 3 | Pending |
| FIXA-01 | Phase 4 | Pending |
| FIXA-02 | Phase 4 | Pending |
| FIXA-03 | Phase 4 | Pending |
| FIXA-04 | Phase 4 | Pending |
| FIXA-05 | Phase 4 | Pending |
| FIXA-06 | Phase 4 | Pending |
| ORCA-01 | Phase 4 | Pending |
| ORCA-02 | Phase 4 | Pending |
| ORCA-03 | Phase 4 | Pending |
| IA-01 | Phase 5 | Pending |
| IA-02 | Phase 5 | Pending |
| IA-03 | Phase 5 | Pending |
| IA-04 | Phase 5 | Pending |
| IA-05 | Phase 5 | Pending |
| IA-06 | Phase 5 | Pending |
| IA-07 | Phase 5 | Pending |
| IA-08 | Phase 5 | Pending |
| TAR-01 | Phase 6 | Pending |
| TAR-02 | Phase 6 | Pending |
| TAR-03 | Phase 6 | Pending |
| TAR-04 | Phase 6 | Pending |
| TAR-05 | Phase 6 | Pending |
| TAR-06 | Phase 6 | Pending |
| TAR-07 | Phase 6 | Pending |
| TAR-08 | Phase 6 | Pending |

**Coverage:**

- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

**Por fase:**

| Fase | Requisitos | Qtd |
|------|-----------|-----|
| Phase 1 — Acesso e espaço compartilhado | AUTH-01..07, CAT-01..04, PLAT-01, PLAT-02 | 13 |
| Phase 2 — Lançar e ver o mês | LANC-01..05, MES-01..04, PLAT-04 | 10 |
| Phase 3 — Cartão, fatura e parcelamento | CART-01..07, PLAT-03 | 8 |
| Phase 4 — Contas fixas e teto por categoria | FIXA-01..06, ORCA-01..03 | 9 |
| Phase 5 — Assistente de IA | IA-01..08 | 8 |
| Phase 6 — Módulo Tarefas | TAR-01..08 | 8 |

---
*Requirements defined: 2026-08-27*
*Last updated: 2026-08-27 — traceability preenchida na criação do ROADMAP.md*

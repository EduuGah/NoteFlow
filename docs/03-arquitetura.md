# 03 — Arquitetura

## Princípio central

O domínio não conhece React, nem Supabase, nem o navegador.

Isso não é purismo. É o que permite testar a fórmula de XP sem montar um componente,
trocar `localStorage` por Postgres sem reescrever regra de negócio, e responder à pergunta
"por que esse streak deu 12?" olhando um único arquivo de 60 linhas.

```
UI (React)  →  Services  →  Domain (puro)
                   ↓
              Repository (interface)
                   ↓
        LocalRepository | SupabaseRepository
```

A seta nunca aponta para trás. `src/domain/` não importa nada de `src/components/`,
`src/data/` ou `src/store/`.

## Camadas

### `src/domain/` — regras de negócio puras

Funções sem efeito colateral, sem I/O, sem `Date.now()` implícito (a data "hoje" é sempre
um parâmetro, para que os testes sejam determinísticos).

| Arquivo | Responsabilidade |
|---|---|
| `levels.ts` | Curva de progressão. `levelFromXp`, `levelProgress`. |
| `xp.ts` | Fórmula de XP de tarefas e hábitos. |
| `streaks.ts` | Sequência atual e maior sequência, a partir dos logs. |
| `tasks.ts` | Máquina de estados: quais transições são válidas, o que é vencido. |
| `recurrence.ts` | Expansão de uma regra de recorrência em ocorrências de um intervalo. |
| `metrics.ts` | Taxa de conclusão, agregações por dia/hora/categoria/motivo. |

Todo arquivo aqui tem um `.test.ts` correspondente em `src/domain/__tests__/`.

### `src/data/` — persistência

`storage.ts` é o único ponto que fala com `localStorage`. Ele dá namespace às chaves e
degrada para memória quando o armazenamento não está disponível (aba anônima, cota
estourada, cookies bloqueados), em vez de deixar a aplicação lançar.

Não existe interface de repositório, e a ausência é deliberada — ver docs/00, D1 (revisado).
A migração para o Supabase acontece no corpo das ações de store, não numa camada de
abstração escrita antes de haver uma segunda implementação.

### `src/store/` — estado e orquestração

Zustand com `persist`. É aqui que uma ação do usuário vira uma sequência completa: validar a
transição pelo domínio → gravar a tarefa → gravar o evento → creditar o XP → devolver o
resultado para a UI mostrar o feedback.

As stores **não contêm fórmula**. Elas orquestram; quem calcula é `src/domain/`. A
separação é o que permite testar toda a regra de negócio sem montar componente nenhum.

Quando o Supabase entrar, é o corpo destas ações que muda — elas viram `async` e passam a
falar com o backend. As funções de domínio e seus testes não são tocados.

### `src/components/ui/` — design system

Primitivos sem conhecimento de domínio. Um `Button` não sabe o que é uma tarefa.

Existem hoje: `Button`/`IconButton`, `Modal`, os campos de formulário (`TextField`,
`TextAreaField`, `SelectField`, `ChoiceGroup`), `EmptyState` e `Toaster`. Os demais
(`Card`, `Badge`, `Progress`, `Skeleton`) entram na Etapa 2, junto com a linguagem visual —
criar primitivo antes de ter onde usar é adivinhação.

### `src/features/<dominio>/` — componentes de domínio

Componentes que conhecem tarefas, hábitos, insights. Compostos a partir dos primitivos.

### `src/pages/` — composição de rota

Montagem. Idealmente sem lógica própria.

## Regras que valem para todo o código

1. **`any` é proibido** sem um comentário explicando a exceção.
2. **Data de calendário é `string` `yyyy-MM-dd`**, nunca `Date`. `Date` só para instantes.
   O helper obrigatório é `src/lib/date.ts` — `toISOString()` fora dele é bug.
3. **Estado derivável não é armazenado.** Nível vem de `xp_total`. Streak vem dos logs.
   Progresso de tarefa vem das subtarefas. Cache denormalizado é permitido, mas a fonte de
   verdade é sempre o dado bruto.
4. **Entrada de usuário é validada na fronteira.** Hoje a validação é estrutural (tipos e
   `satisfies`) mais as restrições do formulário, porque não existe fronteira de rede: o
   dado nasce e morre no mesmo processo. O `zod` está no `package.json` para a Etapa 5,
   quando passar a existir resposta de servidor em que não se pode confiar. Até lá é
   dependência ociosa, e está registrado como tal.
5. **Todo estado de tela tem quatro versões**: carregando (skeleton), vazio, erro, conteúdo.
   Hoje existem o vazio e o de conteúdo; carregando e erro entram quando houver operação
   capaz de demorar ou falhar — antes disso seriam ramos nunca executados.
6. **Cores vêm de tokens.** Nenhum hex literal em componente. Os tokens são definidos na
   Etapa 2; até lá vale a escala neutra do Tailwind, aplicada de forma consistente.

## Event log

Ações relevantes gravam um evento imutável em `events`, com `type`, `entity_id`, `payload`
e `occurred_at`. Nunca se apaga nem se reescreve um evento.

```
TASK_CREATED   TASK_UPDATED   TASK_COMPLETED   TASK_FAILED
TASK_POSTPONED   TASK_CANCELLED   TASK_REOPENED
HABIT_CREATED   HABIT_COMPLETED   HABIT_UNDONE
XP_EARNED   LEVEL_UP
```

O event log é a base dos insights: perguntas como "quantas vezes adiei tarefas de estudo em
setembro" ou "a que horas eu costumo desistir" são consultas ao log, não estado atual.
Estado atual não guarda história — e a história é o produto (seção 68).

## Configuração

Não há variável de ambiente em uso. O `.env.example` guarda as chaves do Supabase para a
Etapa 5; o cliente que apontava para `https://placeholder.supabase.co` foi removido, porque
um cliente que nunca é chamado e aponta para um endereço falso só serve para dar a impressão
de que existe backend.

Quando o Supabase entrar, a leitura das variáveis passa a ser validada na inicialização, e a
ausência de credencial precisa falhar de forma visível — nunca silenciosa.

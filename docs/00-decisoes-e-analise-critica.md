# 00 — Análise Crítica e Decisões de Arquitetura

Documento de resposta à seção 69 da especificação. Registra ambiguidades encontradas,
decisões tomadas e o porquê. Toda decisão aqui é revisável, mas nenhuma deve ser
alterada sem atualizar este arquivo.

---

## Parte 1 — Defeitos encontrados no código existente

Formato: **Problema → Consequência → Solução adotada**.

### D1. Nenhuma persistência

**Problema.** As três stores Zustand (`useTaskStore`, `useHabitStore`, `useProfileStore`)
mantêm dados apenas em memória. O cliente Supabase existe em `src/lib/supabase.ts`, mas
aponta para `https://placeholder.supabase.co` e nunca é chamado.

**Consequência.** Recarregar a página apaga tudo. A seção 68 diz que o valor do produto
está nos dados acumulados ao longo de 3 meses — um produto que perde os dados a cada F5
não tem valor nenhum. Também impede validar qualquer funcionalidade de histórico.

**Solução (revisada na implementação).** Persistência via `zustand/persist` sobre um
adaptador tolerante a falhas (`src/data/storage.ts`), com namespace e versão por store.

A primeira versão desta decisão previa uma interface de repositório assíncrona
(`LocalRepository` hoje, `SupabaseRepository` depois). Ela foi descartada, e vale registrar
por quê, porque o argumento a favor era bom: uma interface assíncrona desde já obrigaria a
interface de usuário a nascer com estados de carregamento, evitando reescrevê-la no dia da
troca.

O que pesou contra: nenhuma dessas operações pode falhar hoje. Os estados de erro e de
carregamento escritos agora seriam código morto — nunca exercitado, nunca testado, e
provavelmente errado quando finalmente rodasse. A seção 58 pede exatamente esse julgamento
("pode ser implementada depois?"), e a 63 alerta contra otimização prematura.

O que preserva a migração barata não é a interface, e sim a disciplina: **nenhum componente
muda estado diretamente**. Toda mutação passa por uma ação de store, que por sua vez delega
a regra a uma função pura de `src/domain/`. Quando o Supabase entrar, o que muda é o corpo
das ações (viram `async` e chamam o repositório); as funções puras e os testes não são
tocados, e o compilador aponta todos os pontos de chamada afetados.

O adaptador de armazenamento já isola o `localStorage`: se ele estiver indisponível — aba
anônima, cota estourada, cookies bloqueados —, a escrita cai para memória em vez de derrubar
a aplicação.

### D2. Regra de negócio na camada de UI

**Problema.** `TaskItem.tsx` faz `completeTask(task.id)` e depois `addXp(task.xp_reward)`
como duas chamadas independentes a duas stores diferentes.

**Consequência.** Viola diretamente a seção 59 ("não colocar regras de negócio nos
componentes de UI"). Pior: não há atomicidade. Qualquer caminho de código que conclua uma
tarefa sem lembrar de chamar `addXp` gera XP perdido; qualquer duplo clique gera XP dobrado.

**Solução.** XP deixa de ser efeito colateral da UI e passa a ser consequência de um evento
de domínio. Um serviço de aplicação executa a transição de estado, grava o evento
(`TASK_COMPLETED`) e credita o XP no ledger `xp_transactions`, com chave de idempotência
derivada de `(tipo, source_id)`. A UI apenas despacha a intenção.

### D3. Streak é um contador que só cresce

**Problema.** `useHabitStore.completeHabit` faz `current_streak: h.current_streak + 1` sem
olhar a data do check-in anterior. Não existe nenhum código que quebre uma sequência.

**Consequência.** Um usuário que marca um hábito uma vez por semana durante um ano exibe
"12 dias", "30 dias", "52 dias". A métrica mente. Como as seções 23–27 constroem insights
sobre consistência, uma métrica mentirosa contamina o produto inteiro.

**Solução.** Streak passa a ser **derivado**, não armazenado: função pura
`calculateStreak(logs, frequency, hoje)` em `src/domain/streaks.ts`, coberta por testes.
O campo `current_streak` na tabela existe apenas como cache denormalizado para listagens,
recalculado a partir dos logs — nunca como fonte de verdade.

### D4. Rótulos de motivo de falha fora de sincronia com o enum

**Problema.** `Insights.tsx` define `FAIL_REASONS_MAP` com as chaves
`time | energy | priority | forgot | other`. O enum real (`FailReason`) usa
`lack_of_time | tiredness | priority_changed | forgot | ...`. Só `forgot` e `other` coincidem.

**Consequência.** Bug visível: o gráfico "Motivos de Falha" renderiza `lack_of_time` e
`tiredness` crus no eixo Y para 8 dos 10 motivos.

**Solução.** Fonte única de verdade em `src/constants/fail-reasons.ts`. A tipagem via
`satisfies Record<FailReason, ...>` faz o TypeScript recusar a compilação se um motivo novo
for adicionado ao enum sem rótulo correspondente.

### D5. Sem navegação no mobile

**Problema.** O `<aside>` do `AppLayout` é `hidden md:flex`. O header mobile contém apenas
o título e um círculo cinza decorativo — nenhum link.

**Consequência.** Em telas menores que 768px o usuário fica preso no Dashboard. Não há como
chegar em Tarefas, Hábitos ou Insights. A seção 49 diz que a experiência mobile é a
**prioritária**, porque é onde o registro acontece durante o dia.

**Solução.** Bottom tab bar fixa no mobile com alvos de toque de 44px ou mais, sidebar no
desktop, e ação rápida sempre alcançável com o polegar.

### D6. `toISOString().split('T')[0]` como definição de "hoje"

**Problema.** Esse padrão aparece em cinco arquivos. `toISOString()` converte para **UTC**.

**Consequência.** Para um usuário em UTC−3, das 21:00 às 23:59 o aplicativo já acha que é o
dia seguinte. As tarefas noturnas — exatamente as das 20h–22h que a seção 23 quer analisar —
são gravadas e contabilizadas no dia errado. É um bug silencioso que corrompe todos os
relatórios e é praticamente impossível de diagnosticar meses depois.

**Solução.** Todo cálculo de data local passa por `src/lib/date.ts`, sobre `date-fns` (já
instalado). Datas de calendário viram string `yyyy-MM-dd` no fuso local; instantes de evento
são `timestamptz`. `toISOString()` fica proibido para datas de calendário.

### D7. Curva de nível linear e XP corrente armazenado

**Problema.** `getXpRequiredForNextLevel = level * 100` gera os limiares 100, 200, 300…
A seção 15 pede 0, 100, 250, 450, 700 (incrementos 100, 150, 200, 250). Além disso,
`xpCurrent` é armazenado e decrementado a cada level-up.

**Consequência.** (a) A progressão não é a especificada. (b) Estado derivável armazenado sai
de sincronia: no dia em que a curva for ajustada, todos os perfis existentes ficam com
`xp_current` inconsistente e sem forma de recalcular.

**Solução.** Persistir **somente `xp_total`**. Nível, XP dentro do nível e XP para o próximo
são funções puras de `xp_total` (`src/domain/levels.ts`). Curva quadrática:

```
xpAcumuladoParaNivel(n) = 25 · (n − 1) · (n + 2)
```

que produz 0, 100, 250, 450, 700, 1000, 1350, 1750… — exatamente os valores da seção 15,
e continua suave depois deles.

### D8. `src/types.ts` é resto de template

**Problema.** Exporta `interface Note` (id, title, content) — de um aplicativo de notas.
Nada importa esse arquivo.

**Consequência.** Código morto que confunde quem lê o repositório e sugere um domínio que
não existe.

**Solução.** Removido. Os tipos de domínio vivem em `src/types/`.

### D9. Sem testes, apesar da seção 65

**Solução.** Vitest configurado. As regras de negócio puras (XP, nível, streak, recorrência,
transições de status, métricas) ficam em `src/domain/`, sem nenhuma dependência de React,
Supabase ou DOM — e são testadas diretamente.

### D10. Defeitos menores corrigidos

- `duration_estimated: 60` fixo no `CreateTaskModal` (comentado no código como "default for now").
- `aside` com `flex ... hidden md:flex` — classes conflitantes na mesma string.
- Dependência `motion` instalada e nunca usada (seção 42: não adicionar bibliotecas
  desnecessárias). Removida.
- Modais sem `Escape`, sem clique no backdrop, sem trap de foco, sem `role="dialog"`
  (seção 62).
- Nenhum estado de carregamento, vazio tipado ou erro em lugar nenhum (seção 60).

---

## Parte 2 — Ambiguidades da especificação e como foram resolvidas

### A1. "Adiada" é status ou é evento? (seções 7 e 8 se contradizem)

A seção 7 lista `Adiada` entre os status. A seção 8 define adiamento como mover a tarefa
para uma nova data, preservando histórico.

**Conflito.** Se `postponed` for um status persistente, a tarefa aparece como "adiada" na
nova data — ou seja, já nasce com estado negativo no dia em que deveria ser feita. E ela
sai do fluxo normal do dia.

**Decisão.** Adiamento **não é status**. É um evento (`TASK_POSTPONED`) que altera
`scheduled_date`, incrementa `postpone_count` e grava origem e destino no log. A tarefa
permanece `planned` na nova data. `postponed` sai do enum de status.

O insight desejado ("você costuma adiar tarefas de estudo") continua disponível através de
`postpone_count` e dos eventos, sem poluir a máquina de estados.

### A2. Quem marca uma tarefa como "não concluída"?

A especificação assume que o usuário responde "por que não fiz". Mas se ele simplesmente não
abrir o aplicativo, a tarefa fica `planned` para sempre.

**Consequência se ignorado.** A taxa de conclusão passa a ser calculada sobre tarefas que o
usuário nunca avaliou. Os relatórios das seções 23–27, que são o coração do produto, ficam
sem base confiável.

**Decisão.**

- `overdue` é estado **derivado**, não persistido: `status === 'planned'` e horário agendado
  no passado. Aparece na interface como pendência.
- Nenhuma tarefa vira falha automaticamente. Marcar falha sozinho seria punitivo e violaria
  a seção 47.
- As métricas separam três conjuntos: **avaliadas** (concluída, falhou, cancelada),
  **não avaliadas** (planejadas e vencidas) e **futuras**. A taxa de conclusão é calculada
  sobre as avaliadas, e a interface mostra explicitamente quantas ficaram sem avaliação —
  esse número é, ele próprio, um insight.
- Pós-MVP: o "Fechamento do dia" (seção 29) pergunta em lote sobre as pendências.

### A3. Hábito gera tarefa? (seção 10)

A seção 10 diz que "o sistema pode gerar tarefas automaticamente a partir dos hábitos".

**Consequência se implementado literalmente no MVP.** Dupla contabilidade: o mesmo evento
gera XP como hábito e como tarefa, e entra duas vezes na taxa de conclusão. Além disso,
gerar linhas em `tasks` para cada dia de cada hábito multiplica o volume de dados sem
necessidade.

**Decisão.** No MVP, hábito **não** materializa tarefa. Hábitos têm check-in próprio
(`habit_logs`) e aparecem na timeline do dia como um tipo de item distinto, na mesma
superfície visual. A timeline consome a união de duas fontes, não uma tabela única.

### A4. Recorrência: materializar ou calcular?

**Consequência de materializar.** Uma tarefa diária por três anos são cerca de 1.100 linhas
por recorrência. Dez recorrências passam de 11 mil linhas por usuário, quase todas nunca
tocadas. E editar a regra exige reescrever o futuro inteiro.

**Decisão.** A regra é armazenada uma vez (`task_recurrences`). As ocorrências são
**virtuais** — calculadas sob demanda para o intervalo visível — e só viram linha real em
`tasks` no momento em que o usuário interage com aquela ocorrência (conclui, falha, adia,
edita). É a estratégia de calendários reais e mantém o banco enxuto.

### A5. XP fixo por dificuldade (seção 13) versus fórmula (seção 14)

A seção 13 dá valores fixos; a 14 pede fórmula com multiplicadores; e ambas pedem
simplicidade no MVP.

**Decisão.** Uma única fórmula, aplicada a tarefas e hábitos:

```
XP = arredonda( base(dificuldade) × mult(prioridade) × fator(duração) )
```

com `base` = 10/25/50 (mantendo os números da seção 13 como caso central),
`mult(prioridade)` entre 0,9 e 1,3, e `fator(duração)` limitado ao intervalo [1,0 ; 1,5].
Existe teto por atividade para evitar inflação.

Consistência (streak) **não** entra na fórmula do MVP: criaria um efeito bola de neve em que
quem já vai bem ganha cada vez mais e quem falhou uma vez fica para trás — o oposto do que
pede a seção 47.

### A6. Score do dia (seção 32) e Overplanning (seção 34)

Ambos dependem de baseline histórica do próprio usuário. Com menos de duas semanas de dados,
o número é ruído — e mostrar ruído com aparência de precisão destrói a confiança no produto.

**Decisão.** Fora do MVP. Entram quando existir histórico suficiente, e sempre com um piso
mínimo declarado na interface ("precisamos de 14 dias de registro para calcular isso").

---

## Parte 3 — O que foi cortado do MVP e por quê

| Recurso | Seção | Por que fora do MVP |
|---|---|---|
| Rotinas | 11 | É um agrupamento de tarefas. Só agrega valor depois que tarefas e recorrência estiverem sólidas. |
| Conquistas | 18 | Dependem de métricas estáveis. Conquista calculada sobre métrica errada é pior que conquista nenhuma. |
| Daily Review, humor, energia | 29–30 | Exigem adesão diária; sem base de uso não há o que cruzar. |
| Pomodoro | 39 | É um produto dentro do produto. |
| Overplanning, Daily Score | 32, 34 | Precisam de baseline histórica (ver A6). |
| Notificações | 40 | Exigem service worker e permissão do navegador; custo alto, valor só aparece com uso real. |
| Linguagem natural | 51 | O Quick Add estruturado entrega 90% do valor com uma fração do custo. |
| Exportação | 54 | Trivial de adicionar depois; o modelo de dados já suporta. |
| Hierarquia acima de 2 níveis | 6 | Modelada no banco (`parent_task_id`), não exposta na interface. |

---

## Parte 4 — Ordem de implementação

1. **Fundação** (etapa atual): documentação, design system, camada de domínio pura com
   testes, camada de dados com repositório, correção dos defeitos D1–D10.
2. **Núcleo de tarefas**: categorias, subtarefas, adiamento, Quick Add, filtros.
3. **Agenda**: timeline, visão de semana, recorrência.
4. **Hábitos**: streak derivado, calendário de check-ins.
5. **Gamificação**: ledger de XP, níveis, eventos.
6. **Analytics**: métricas reais construídas sobre o event log.
7. **Backend**: Supabase, autenticação, RLS, migração do adapter local.

O Supabase fica por último de propósito: com as mutações concentradas nas ações de store,
a troca é uma mudança localizada, e até lá nada bloqueia o desenvolvimento à espera de
credenciais.

---

## Parte 5 — Estado ao fim da Etapa 1

Concluído e verificado (`npm test`, `npm run build` e uso no navegador):

- Camada de domínio pura, sem React nem armazenamento: XP, níveis, sequências, recorrência,
  transições de status e métricas. 133 testes.
- Persistência local: os dados sobrevivem ao recarregamento.
- Ledger de XP com chave de idempotência; nível e progresso derivados de `xp_total`.
- Event log de domínio, gravando adiamentos e remarcações (seções 45 e 46).
- Defeitos D1 a D10 corrigidos.
- Navegação mobile, modal acessível e feedback de ação.

Deliberadamente **fora** desta etapa, para as seguintes:

| Item | Etapa |
|---|---|
| Linguagem visual, tokens de tema, refino responsivo | 2 |
| Subtarefas, categorias, tags, filtros, busca | 3 |
| Recorrência ligada à interface (o domínio já existe e está testado) | 3 |
| Calendário, visão de semana e de mês | 4 |
| Supabase, autenticação, RLS | 5 |
| Relatórios semanal e mensal, gráficos de série temporal | 6 |

Pendências conhecidas, registradas para não virarem surpresa:

- `recharts` continua no `package.json` sem uso. Os recortes da Etapa 1 são barras de série
  única, que ficam melhores em CSS puro — acessíveis, sem peso e sem dependência. A
  biblioteca é mantida porque a Etapa 6 precisa de séries temporais de verdade; se não
  precisar, sai.
- Dois arquivos de lock convivem (`bun.lock` e `package-lock.json`). Só o npm está instalado
  nesta máquina. É preciso escolher um.
- Não há `ErrorBoundary`. Faz sentido junto com os estados de erro, na Etapa 2.

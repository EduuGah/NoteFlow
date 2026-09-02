# NoteFlow

Plataforma pessoal de organização e acompanhamento de rotina. Registra não só o que foi
feito, mas o contexto da execução — inclusive o motivo do que não aconteceu — para que o
histórico acumulado responda perguntas sobre a própria rotina.

O valor do produto está nos dados acumulados: depois de alguns meses, onde o tempo foi
gasto, quais hábitos se sustentaram, quais tarefas costumam ser adiadas, em que horários a
execução falha.

## Rodando

```bash
npm install
npm run dev
```

O aplicativo sobe em `http://localhost:3000`. Não é preciso configurar nada: os dados ficam
no `localStorage` do navegador. Ainda não existe backend.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm test` | Testes das regras de negócio |
| `npm run typecheck` | Verificação de tipos |
| `npm run build` | Build de produção |

## Estrutura

```
src/
  domain/      Regras de negócio puras, sem React e sem I/O. Onde vivem as fórmulas.
  store/       Estado e orquestração (Zustand). Onde uma intenção vira uma sequência.
  data/        Persistência. Único ponto que fala com localStorage.
  components/  Primitivos de interface, sem conhecimento de domínio.
  features/    Componentes que conhecem tarefas, hábitos, insights.
  pages/       Composição de rota.
  lib/         Utilitários — datas, identificadores, classes CSS.
  constants/   Rótulos e opções, com o enum como fonte única.
  types/       Modelo de domínio.
```

Duas regras estruturais valem em todo o código:

- **Nenhuma regra de negócio em componente.** A UI despacha a intenção; a store orquestra;
  o domínio calcula.
- **Estado derivável não é armazenado.** O nível vem de `xp_total`, a sequência vem dos
  check-ins, o progresso vem das subtarefas. Não existe contador a ser mantido em sincronia.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/00](docs/00-decisoes-e-analise-critica.md) | Defeitos encontrados, ambiguidades da especificação e as decisões tomadas, com o porquê |
| [docs/03](docs/03-arquitetura.md) | Camadas, responsabilidades e as regras que valem para todo o código |

## Estado

Etapa 1 (fundação) concluída: domínio testado, persistência local, gamificação com ledger de
XP, event log e navegação mobile. As etapas seguintes estão listadas em
[docs/00](docs/00-decisoes-e-analise-critica.md), Parte 5.

O Supabase entra deliberadamente por último: o modelo de dados ainda vai mudar, e migrar
para o Postgres antes disso significaria reescrever migrações e políticas de acesso a cada
mudança.

/**
 * Tipos de domínio do NoteFlow.
 *
 * Convenções (ver docs/03-arquitetura.md):
 * - `IsoDate` é uma data de calendário no fuso LOCAL do usuário (`yyyy-MM-dd`).
 * - `IsoDateTime` é um instante absoluto (ISO 8601 com fuso).
 * - `ClockTime` é um horário de parede (`HH:mm`), sem data e sem fuso.
 *
 * Estado derivável nunca aparece aqui como campo persistido. Nível vem de `xp_total`,
 * streak vem dos logs, progresso vem das subtarefas.
 */

/** Data de calendário local, `yyyy-MM-dd`. Nunca produzida por `toISOString()`. */
export type IsoDate = string;

/** Instante absoluto, ISO 8601. */
export type IsoDateTime = string;

/** Horário de parede, `HH:mm`. */
export type ClockTime = string;

// ---------------------------------------------------------------------------
// Tarefas
// ---------------------------------------------------------------------------

/**
 * `postponed` não existe de propósito: adiar é um evento que move a data, não um
 * estado em que a tarefa fica presa. Ver docs/00, ambiguidade A1.
 */
export type TaskStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskDifficulty = 'easy' | 'medium' | 'hard';

export type FailReason =
  | 'lack_of_time'
  | 'tiredness'
  | 'forgot'
  | 'lack_of_motivation'
  | 'unexpected_event'
  | 'priority_changed'
  | 'procrastination'
  | 'external_problem'
  | 'no_longer_necessary'
  | 'other';

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_at: IsoDateTime;
}

export interface Task {
  id: string;
  user_id: string;

  title: string;
  description: string | null;

  /** Reservado para hierarquia futura (seção 6). Não exposto na interface do MVP. */
  parent_task_id: string | null;

  scheduled_date: IsoDate | null;
  scheduled_time: ClockTime | null;
  /** Minutos. */
  duration_estimated: number | null;
  /** Minutos. Preenchido na conclusão, quando informado. */
  duration_actual: number | null;

  priority: TaskPriority;
  difficulty: TaskDifficulty;
  status: TaskStatus;

  category_id: string | null;
  tags: string[];

  /** Congelado na criação: mudar a fórmula depois não deve reescrever o passado. */
  xp_reward: number;

  /** Origem, quando a tarefa nasceu de uma regra de recorrência. */
  recurrence_id: string | null;
  /** Data da ocorrência dentro da série. Torna a materialização idempotente. */
  occurrence_date: IsoDate | null;

  fail_reason: FailReason | null;
  fail_notes: string | null;

  /** Quantas vezes a tarefa foi adiada. Base do insight de procrastinação. */
  postpone_count: number;
  /** Primeira data em que a tarefa foi agendada, antes de qualquer adiamento. */
  original_date: IsoDate | null;

  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  completed_at: IsoDateTime | null;
}

// ---------------------------------------------------------------------------
// Recorrência
// ---------------------------------------------------------------------------

export type RecurrenceFrequency =
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | 'custom';

/** 0 = domingo … 6 = sábado, alinhado com `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  /** Usado por `weekly`. Ex.: [1, 3, 5] para segunda, quarta e sexta. */
  weekdays?: Weekday[];
  /** Usado por `monthly`. Dia do mês, 1–31. */
  monthDay?: number;
  /** Usado por `custom`. Intervalo em dias a partir de `startDate`. */
  intervalDays?: number;
  startDate: IsoDate;
  endDate?: IsoDate | null;
}

// ---------------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------------

export type HabitFrequency = 'daily' | 'weekdays' | 'weekly';

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: HabitFrequency;
  /** Usado quando a frequência é `weekly`. */
  weekdays: Weekday[];
  category_id: string | null;
  preferred_time: ClockTime | null;
  difficulty: TaskDifficulty;
  xp_reward: number;
  is_archived: boolean;
  created_at: IsoDateTime;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  /** Data local do check-in. Um único log por hábito por dia. */
  date: IsoDate;
  logged_at: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  user_id: string;
  name: string;
  /** Chave de um token de cor do design system, não um hex. */
  color: CategoryColor;
  is_default: boolean;
  created_at: IsoDateTime;
}

export type CategoryColor =
  | 'slate'
  | 'blue'
  | 'teal'
  | 'green'
  | 'amber'
  | 'orange'
  | 'rose'
  | 'violet';

// ---------------------------------------------------------------------------
// Gamificação
// ---------------------------------------------------------------------------

export type XpSourceType = 'task' | 'habit' | 'routine' | 'achievement';

/**
 * Ledger append-only. O XP total é a soma das transações — nunca um contador
 * incrementado à mão. `idempotency_key` impede crédito duplo em duplo clique
 * ou em reenvio de requisição.
 */
export interface XpTransaction {
  id: string;
  user_id: string;
  amount: number;
  source_type: XpSourceType;
  source_id: string;
  idempotency_key: string;
  /** Instante absoluto do crédito. */
  earned_at: IsoDateTime;
  /**
   * Data de calendário LOCAL do crédito.
   *
   * Redundante com `earned_at` de propósito. Derivar o dia fatiando o timestamp UTC é
   * exatamente o defeito D6: um XP ganho às 21h30 em UTC−3 seria contabilizado no dia
   * seguinte, e o "+125 XP de hoje" da seção 20 mostraria o número errado toda noite.
   */
  earned_date: IsoDate;
}

export interface Profile {
  id: string;
  username: string | null;
  /** Única fonte de verdade da gamificação. Nível e progresso derivam daqui. */
  xp_total: number;
  timezone: string;
  created_at: IsoDateTime;
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

export type DomainEventType =
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_POSTPONED'
  | 'TASK_CANCELLED'
  | 'TASK_REOPENED'
  | 'HABIT_CREATED'
  | 'HABIT_COMPLETED'
  | 'HABIT_UNDONE'
  | 'XP_EARNED'
  | 'LEVEL_UP';

/** Imutável. Nunca atualizado, nunca apagado. */
export interface DomainEvent {
  id: string;
  user_id: string;
  type: DomainEventType;
  entity_id: string;
  payload: Record<string, unknown>;
  occurred_at: IsoDateTime;
}

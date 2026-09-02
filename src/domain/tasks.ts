/**
 * Máquina de estados e estados derivados de tarefas.
 *
 * Duas decisões estruturais, documentadas em docs/00 (A1 e A2):
 *
 * - `postponed` não é status. Adiar move a data e mantém a tarefa `planned`, para que
 *   ela chegue ao novo dia como uma tarefa normal e não como uma pendência já marcada.
 * - `overdue` também não é status. É derivado de (planned + horário no passado). Nenhuma
 *   tarefa vira falha sozinha: só o usuário registra uma falha, porque só ele sabe o motivo,
 *   e marcar falha automaticamente seria punitivo (seção 47).
 */

import { toLocalDateTime } from '../lib/date';
import type { IsoDate, Subtask, Task, TaskStatus } from '../types/domain';

/** Transições permitidas. Qualquer outra é bug e deve falhar cedo, no serviço. */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  planned: ['in_progress', 'completed', 'failed', 'cancelled'],
  in_progress: ['planned', 'completed', 'failed', 'cancelled'],
  // Estados finais permitem reabertura: o usuário erra o clique, e desfazer é essencial.
  completed: ['planned'],
  failed: ['planned', 'completed'],
  cancelled: ['planned'],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isOpen(task: Pick<Task, 'status'>): boolean {
  return task.status === 'planned' || task.status === 'in_progress';
}

export function isFinished(task: Pick<Task, 'status'>): boolean {
  return !isOpen(task);
}

/** Aberta e com horário já passado. Não persistido — recalculado a cada render. */
export function isOverdue(
  task: Pick<Task, 'status' | 'scheduled_date' | 'scheduled_time'>,
  now: Date = new Date(),
): boolean {
  if (!isOpen(task) || !task.scheduled_date) return false;
  return toLocalDateTime(task.scheduled_date, task.scheduled_time) < now;
}

/**
 * Classificação usada por todas as métricas.
 *
 * Separar "não avaliada" de "falhou" é o que impede a taxa de conclusão de mentir. Uma
 * tarefa que o usuário nunca respondeu não é sucesso nem fracasso — é ausência de dado,
 * e essa ausência é ela própria um insight ("você deixou 14 atividades sem avaliar").
 */
export type EvaluationBucket = 'evaluated' | 'unevaluated' | 'upcoming';

export function evaluationBucket(
  task: Pick<Task, 'status' | 'scheduled_date' | 'scheduled_time'>,
  now: Date = new Date(),
): EvaluationBucket {
  if (isFinished(task)) return 'evaluated';
  return isOverdue(task, now) ? 'unevaluated' : 'upcoming';
}

export interface TaskProgress {
  done: number;
  total: number;
  percent: number;
}

/** Progresso pelas subtarefas. Sem subtarefas, o progresso é o próprio status. */
export function subtaskProgress(subtasks: Subtask[]): TaskProgress {
  const total = subtasks.length;
  const done = subtasks.filter((s) => s.is_done).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/** Ordenação da timeline: por horário; tarefas sem horário vão para o fim do dia. */
export function compareBySchedule(a: Task, b: Task): number {
  const timeA = a.scheduled_time ?? '99:99';
  const timeB = b.scheduled_time ?? '99:99';
  if (timeA !== timeB) return timeA.localeCompare(timeB);
  return a.created_at.localeCompare(b.created_at);
}

export function tasksForDate(tasks: Task[], date: IsoDate): Task[] {
  return tasks.filter((t) => t.scheduled_date === date).sort(compareBySchedule);
}

/**
 * Pendências arrastadas de dias anteriores. Aparecem no topo do dia atual para que o
 * usuário decida o que fazer com elas — que é como a avaliação acontece na prática.
 */
export function overdueFromPreviousDays(
  tasks: Task[],
  todayDate: IsoDate,
  now: Date = new Date(),
): Task[] {
  return tasks
    .filter(
      (t) =>
        isOpen(t) &&
        t.scheduled_date !== null &&
        t.scheduled_date < todayDate &&
        isOverdue(t, now),
    )
    .sort(compareBySchedule);
}

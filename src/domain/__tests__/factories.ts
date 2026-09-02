/**
 * Fábricas de teste.
 *
 * Existem para que cada teste declare apenas os campos que importam para o que ele
 * verifica. Um teste que precisa montar 25 campos de `Task` para checar uma taxa de
 * conclusão esconde a própria intenção.
 */

import type { Task, TaskStatus } from '../../types/domain';

let counter = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
  counter += 1;
  const now = '2026-09-01T10:00:00.000Z';

  return {
    id: `task-${counter}`,
    user_id: 'test-user',
    title: `Tarefa ${counter}`,
    description: null,
    parent_task_id: null,
    scheduled_date: '2026-09-01',
    scheduled_time: '09:00',
    duration_estimated: 30,
    duration_actual: null,
    priority: 'medium',
    difficulty: 'medium',
    status: 'planned' as TaskStatus,
    category_id: null,
    tags: [],
    xp_reward: 25,
    recurrence_id: null,
    occurrence_date: null,
    fail_reason: null,
    fail_notes: null,
    postpone_count: 0,
    original_date: '2026-09-01',
    created_at: now,
    updated_at: now,
    completed_at: null,
    ...overrides,
  };
}

/** Instante local usado como "agora" nos testes que dependem de vencimento. */
export function localTime(
  year: number,
  month: number,
  day: number,
  hours = 12,
  minutes = 0,
): Date {
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

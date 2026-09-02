/**
 * Store de tarefas.
 *
 * Toda regra de negócio de tarefa vive aqui ou em `src/domain/` — nunca num componente.
 * Isso corrige o defeito D2: antes, `TaskItem` chamava `completeTask()` e `addXp()` como
 * duas ações independentes, e qualquer caminho que esquecesse a segunda perdia XP
 * silenciosamente. Agora concluir é uma operação só, e o XP é consequência dela.
 *
 * As ações são síncronas de propósito. Ver docs/00, D1 (revisado).
 */

import { create } from 'zustand';
import { createStorePersist } from './persist';
import { recordEvent } from './useEventStore';
import { useProfileStore } from './useProfileStore';
import type { AwardXpResult } from './useProfileStore';
import { createId } from '../lib/id';
import { today } from '../lib/date';
import { LOCAL_USER_ID } from '../constants/app';
import { canTransition, isOpen } from '../domain/tasks';
import { calculateTaskXp } from '../domain/xp';
import type {
  ClockTime,
  FailReason,
  IsoDate,
  Task,
  TaskDifficulty,
  TaskPriority,
} from '../types/domain';

export interface NewTaskInput {
  title: string;
  description?: string | null;
  scheduled_date: IsoDate | null;
  scheduled_time: ClockTime | null;
  duration_estimated: number | null;
  priority: TaskPriority;
  difficulty: TaskDifficulty;
  category_id?: string | null;
  tags?: string[];
}

/** Campos que o usuário pode editar. Status e XP mudam por ação própria, não por patch. */
export type TaskPatch = Partial<
  Pick<
    Task,
    | 'title'
    | 'description'
    | 'scheduled_date'
    | 'scheduled_time'
    | 'duration_estimated'
    | 'priority'
    | 'difficulty'
    | 'category_id'
    | 'tags'
  >
>;

interface TaskState {
  tasks: Task[];

  createTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: TaskPatch) => void;
  deleteTask: (id: string) => void;

  /** `null` quando a transição não é permitida a partir do status atual. */
  completeTask: (id: string, durationActual?: number | null) => AwardXpResult | null;
  failTask: (id: string, reason: FailReason, notes?: string) => boolean;
  cancelTask: (id: string) => boolean;
  postponeTask: (id: string, newDate: IsoDate) => boolean;
  reopenTask: (id: string) => boolean;

  reset: () => void;
}

/** Aplica um patch renovando `updated_at`. Uso interno. */
function patched(task: Task, changes: Partial<Task>): Task {
  return { ...task, ...changes, updated_at: new Date().toISOString() };
}

export const useTaskStore = create<TaskState>()(
  createStorePersist(
    (set, get) => ({
      tasks: [],

      createTask: (input) => {
        const now = new Date().toISOString();
        const task: Task = {
          id: createId(),
          user_id: LOCAL_USER_ID,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          parent_task_id: null,
          scheduled_date: input.scheduled_date,
          scheduled_time: input.scheduled_time,
          duration_estimated: input.duration_estimated,
          duration_actual: null,
          priority: input.priority,
          difficulty: input.difficulty,
          status: 'planned',
          category_id: input.category_id ?? null,
          tags: input.tags ?? [],
          // Congelado na criação: ajustar a fórmula depois não pode reescrever o passado.
          xp_reward: calculateTaskXp({
            difficulty: input.difficulty,
            priority: input.priority,
            durationMinutes: input.duration_estimated,
          }),
          recurrence_id: null,
          occurrence_date: null,
          fail_reason: null,
          fail_notes: null,
          postpone_count: 0,
          original_date: input.scheduled_date,
          created_at: now,
          updated_at: now,
          completed_at: null,
        };

        set((state) => ({ tasks: [...state.tasks, task] }));
        recordEvent('TASK_CREATED', task.id, {
          title: task.title,
          date: task.scheduled_date,
        });
        return task;
      },

      updateTask: (id, patch) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        // A seção 45 pede que remarcar não apague o passado. O estado guarda apenas o valor
        // atual, então a mudança de horário precisa virar evento para sobreviver.
        const rescheduled =
          (patch.scheduled_date !== undefined &&
            patch.scheduled_date !== task.scheduled_date) ||
          (patch.scheduled_time !== undefined &&
            patch.scheduled_time !== task.scheduled_time);

        // Reprecifica o XP só enquanto a tarefa está aberta: mudar a dificuldade depois de
        // concluída alteraria retroativamente um crédito já registrado no ledger.
        const affectsXp =
          isOpen(task) &&
          (patch.difficulty !== undefined ||
            patch.priority !== undefined ||
            patch.duration_estimated !== undefined);

        const next = patched(task, {
          ...patch,
          ...(affectsXp
            ? {
                xp_reward: calculateTaskXp({
                  difficulty: patch.difficulty ?? task.difficulty,
                  priority: patch.priority ?? task.priority,
                  durationMinutes:
                    patch.duration_estimated !== undefined
                      ? patch.duration_estimated
                      : task.duration_estimated,
                }),
              }
            : {}),
        });

        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === id ? next : t)),
        }));

        recordEvent('TASK_UPDATED', id, {
          ...(rescheduled
            ? {
                from: { date: task.scheduled_date, time: task.scheduled_time },
                to: { date: next.scheduled_date, time: next.scheduled_time },
              }
            : {}),
          fields: Object.keys(patch),
        });
      },

      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        useProfileStore.getState().revokeXp('task', id);
      },

      completeTask: (id, durationActual = null) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || !canTransition(task.status, 'completed')) return null;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? patched(t, {
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  duration_actual: durationActual ?? t.duration_actual,
                  fail_reason: null,
                  fail_notes: null,
                })
              : t,
          ),
        }));

        recordEvent('TASK_COMPLETED', id, {
          xp: task.xp_reward,
          scheduled_time: task.scheduled_time,
        });

        return useProfileStore.getState().awardXp({
          amount: task.xp_reward,
          sourceType: 'task',
          sourceId: id,
        });
      },

      failTask: (id, reason, notes) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || !canTransition(task.status, 'failed')) return false;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? patched(t, {
                  status: 'failed',
                  fail_reason: reason,
                  fail_notes: notes?.trim() || null,
                  completed_at: null,
                })
              : t,
          ),
        }));

        // Falhar não retira XP. A seção 47 proíbe punição: o registro serve para análise,
        // não para cobrança. Só existe revogação para desfazer crédito indevido.
        recordEvent('TASK_FAILED', id, {
          reason,
          scheduled_time: task.scheduled_time,
        });
        return true;
      },

      cancelTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || !canTransition(task.status, 'cancelled')) return false;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? patched(t, { status: 'cancelled' }) : t,
          ),
        }));
        recordEvent('TASK_CANCELLED', id, {});
        return true;
      },

      postponeTask: (id, newDate) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || !isOpen(task) || newDate === task.scheduled_date) return false;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? patched(t, {
                  scheduled_date: newDate,
                  // A tarefa segue `planned`: ela chega ao novo dia como atividade normal,
                  // e não como pendência já marcada. Ver docs/00, A1.
                  status: 'planned',
                  postpone_count: t.postpone_count + 1,
                  original_date: t.original_date ?? t.scheduled_date ?? today(),
                })
              : t,
          ),
        }));

        recordEvent('TASK_POSTPONED', id, {
          from: task.scheduled_date,
          to: newDate,
          count: task.postpone_count + 1,
        });
        return true;
      },

      reopenTask: (id) => {
        const task = get().tasks.find((t) => t.id === id);
        if (!task || !canTransition(task.status, 'planned')) return false;

        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id
              ? patched(t, {
                  status: 'planned',
                  completed_at: null,
                  fail_reason: null,
                  fail_notes: null,
                })
              : t,
          ),
        }));

        // Devolve o XP ao ledger para que o total continue refletindo o que foi concluído.
        // Sem isso, desfazer um clique errado deixaria crédito órfão e ainda travaria a
        // próxima conclusão legítima, recusada pela chave de idempotência.
        if (task.status === 'completed') {
          useProfileStore.getState().revokeXp('task', id);
        }

        recordEvent('TASK_REOPENED', id, { from: task.status });
        return true;
      },

      reset: () => set({ tasks: [] }),
    }),
    { name: 'tasks', version: 1 },
  ),
);

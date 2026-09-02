/**
 * Lista de tarefas.
 *
 * Agrupa por dia em vez de por status: o produto organiza uma rotina, e rotina se lê em
 * ordem cronológica. Dentro do dia, o que está aberto vem antes do que já foi resolvido,
 * porque é sobre o que está aberto que o usuário precisa agir.
 */

import { useMemo, useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { compareBySchedule, isOpen } from '../domain/tasks';
import { addDaysIso, formatRelativeDay, today } from '../lib/date';
import type { Task } from '../types/domain';
import { TaskItem } from '../features/tasks/components/TaskItem';
import { CreateTaskModal } from '../features/tasks/components/CreateTaskModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../lib/utils';

type Range = 'today' | 'week' | 'open' | 'all';

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'open', label: 'Em aberto' },
  { value: 'all', label: 'Tudo' },
];

export function Tasks() {
  const tasks = useTaskStore((state) => state.tasks);
  const [range, setRange] = useState<Range>('today');
  const [isCreateOpen, setCreateOpen] = useState(false);

  const todayIso = today();

  const groups = useMemo(() => {
    const weekEnd = addDaysIso(todayIso, 7);

    const filtered = tasks.filter((task) => {
      switch (range) {
        case 'today':
          return task.scheduled_date === todayIso;
        case 'week':
          return (
            task.scheduled_date !== null &&
            task.scheduled_date >= todayIso &&
            task.scheduled_date <= weekEnd
          );
        case 'open':
          return isOpen(task);
        case 'all':
          return true;
      }
    });

    // Sem data vai para o fim, sob uma chave própria, em vez de sumir da lista.
    const byDate = new Map<string, Task[]>();
    for (const task of filtered) {
      const key = task.scheduled_date ?? '9999-99-99';
      byDate.set(key, [...(byDate.get(key) ?? []), task]);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        tasks: [...items].sort((a, b) => {
          if (isOpen(a) !== isOpen(b)) return isOpen(a) ? -1 : 1;
          return compareBySchedule(a, b);
        }),
      }));
  }, [tasks, range, todayIso]);

  const total = groups.reduce((sum, group) => sum + group.tasks.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Tarefas</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Seu planejamento e o que já foi registrado.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Nova tarefa
        </Button>
      </header>

      <div
        role="tablist"
        aria-label="Período"
        className="flex gap-1 overflow-x-auto border-b border-neutral-200"
      >
        {RANGES.map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={range === option.value}
            onClick={() => setRange(option.value)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900',
              range === option.value
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-800',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<CheckSquare size={32} strokeWidth={1.5} />}
          title="Nada por aqui"
          description={
            range === 'today'
              ? 'Você ainda não planejou nada para hoje.'
              : 'Nenhuma tarefa neste período.'
          }
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Criar tarefa
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.date} className="space-y-2.5">
              <h2 className="text-sm font-semibold text-neutral-900">
                {group.date === '9999-99-99' ? 'Sem data' : formatRelativeDay(group.date)}
              </h2>
              <div className="space-y-2.5">
                {group.tasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CreateTaskModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

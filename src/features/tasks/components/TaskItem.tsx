/**
 * Cartão de tarefa.
 *
 * Mudança estrutural em relação à versão anterior: o componente não sabe mais somar XP.
 * Antes ele chamava `completeTask()` e `addXp()` em sequência — duas stores, sem
 * atomicidade, e XP dobrado em duplo clique (defeito D2). Agora ele despacha a intenção e
 * apenas apresenta o que a store devolveu.
 */

import { useState } from 'react';
import { Check, Clock, RotateCcw, Undo2, X } from 'lucide-react';
import type { Task } from '../../../types/domain';
import { useTaskStore } from '../../../store/useTaskStore';
import { toast } from '../../../store/useToastStore';
import { isOpen, isOverdue } from '../../../domain/tasks';
import { failReasonLabel } from '../../../constants/fail-reasons';
import { PRIORITY_ACCENT, PRIORITY_LABELS, formatDuration } from '../../../constants/task';
import { addDaysIso, today } from '../../../lib/date';
import { cn } from '../../../lib/utils';
import { IconButton } from '../../../components/ui/Button';
import { FailTaskModal } from './FailTaskModal';

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const completeTask = useTaskStore((state) => state.completeTask);
  const reopenTask = useTaskStore((state) => state.reopenTask);
  const postponeTask = useTaskStore((state) => state.postponeTask);
  const [isFailModalOpen, setFailModalOpen] = useState(false);

  const open = isOpen(task);
  const overdue = isOverdue(task);
  const completed = task.status === 'completed';
  const failed = task.status === 'failed';
  const accent = PRIORITY_ACCENT[task.priority];

  function handleComplete() {
    const result = completeTask(task.id);
    if (!result) return;

    if (result.leveledUp) {
      toast('Nível ' + result.level + ' alcançado', `+${result.awarded} XP`, 'celebration');
    } else if (result.duplicate) {
      toast('Atividade concluída');
    } else {
      toast('Atividade concluída', `+${result.awarded} XP`, 'success');
    }
  }

  function handlePostpone() {
    const base = task.scheduled_date ?? today();
    if (postponeTask(task.id, addDaysIso(base, 1))) {
      toast('Adiada para amanhã', undefined, 'neutral');
    }
  }

  return (
    <>
      <article
        className={cn(
          'group relative overflow-hidden rounded-xl border bg-white transition-colors',
          completed && 'border-neutral-200 bg-neutral-50/60',
          failed && 'border-neutral-200',
          open && !overdue && 'border-neutral-200 hover:border-neutral-300',
          open && overdue && 'border-amber-200 bg-amber-50/30',
        )}
      >
        {/* Faixa lateral de prioridade: sinaliza sem gastar cor no corpo do cartão. */}
        {accent && open && (
          <span
            className={cn('absolute inset-y-0 left-0 w-1', accent)}
            aria-hidden="true"
          />
        )}

        <div className="flex items-start gap-3 p-4 pl-5">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                'text-[15px] font-medium leading-snug',
                completed ? 'text-neutral-500 line-through' : 'text-neutral-900',
              )}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{task.description}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-neutral-500">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock size={13} strokeWidth={1.75} aria-hidden="true" />
                {task.scheduled_time ?? 'Sem horário'}
              </span>

              {task.duration_estimated !== null && (
                <span className="tabular-nums">{formatDuration(task.duration_estimated)}</span>
              )}

              {accent && (
                <span className="text-neutral-600">{PRIORITY_LABELS[task.priority]}</span>
              )}

              {open && <span className="tabular-nums text-neutral-400">{task.xp_reward} XP</span>}

              {task.postpone_count > 0 && (
                <span className="inline-flex items-center gap-1 text-neutral-500">
                  <RotateCcw size={12} strokeWidth={1.75} aria-hidden="true" />
                  adiada {task.postpone_count}×
                </span>
              )}

              {overdue && open && (
                <span className="font-medium text-amber-700">Sem registro</span>
              )}

              {completed && <span className="font-medium text-emerald-700">Concluída</span>}

              {failed && (
                <span className="font-medium text-neutral-600">
                  Não realizada
                  {task.fail_reason ? ` · ${failReasonLabel(task.fail_reason)}` : ''}
                </span>
              )}
            </div>

            {failed && task.fail_notes && (
              <p className="mt-2 border-l-2 border-neutral-200 pl-3 text-sm text-neutral-500">
                {task.fail_notes}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {open ? (
              <>
                <IconButton
                  label="Adiar para amanhã"
                  variant="ghost"
                  onClick={handlePostpone}
                  className="hidden sm:inline-flex"
                >
                  <RotateCcw size={17} strokeWidth={1.75} />
                </IconButton>
                <IconButton
                  label="Registrar como não realizada"
                  variant="secondary"
                  onClick={() => setFailModalOpen(true)}
                >
                  <X size={17} strokeWidth={2} />
                </IconButton>
                <IconButton label="Concluir" variant="primary" onClick={handleComplete}>
                  <Check size={17} strokeWidth={2.25} />
                </IconButton>
              </>
            ) : (
              <IconButton
                label="Desfazer"
                variant="ghost"
                onClick={() => {
                  if (reopenTask(task.id)) toast('Atividade reaberta');
                }}
              >
                <Undo2 size={17} strokeWidth={1.75} />
              </IconButton>
            )}
          </div>
        </div>
      </article>

      <FailTaskModal
        task={task}
        isOpen={isFailModalOpen}
        onClose={() => setFailModalOpen(false)}
      />
    </>
  );
}

/**
 * Dashboard (seções 20 e 21).
 *
 * Responde "como está o meu dia" antes de qualquer rolagem: planejadas, concluídas,
 * pendentes, sem registro, XP do dia e percentual de execução.
 *
 * A timeline foi refeita. A versão anterior alternava os cartões à esquerda e à direita de
 * uma linha central (`md:odd:flex-row-reverse`), o que obriga o olho a ziguezaguear para
 * ler uma sequência de horários — e horário é justamente o que se lê em ordem. Agora é um
 * trilho único à esquerda, com o horário alinhado em coluna própria.
 */

import { useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore, useActiveHabits, isCheckedIn } from '../store/useHabitStore';
import { useProfileStore, useLevelProgress, xpEarnedOn } from '../store/useProfileStore';
import { completionStats } from '../domain/metrics';
import { overdueFromPreviousDays, tasksForDate } from '../domain/tasks';
import { formatLongDate, today } from '../lib/date';
import { TaskItem } from '../features/tasks/components/TaskItem';
import { HabitItem } from '../features/habits/components/HabitItem';
import { CreateTaskModal } from '../features/tasks/components/CreateTaskModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function Dashboard() {
  const tasks = useTaskStore((state) => state.tasks);
  const habits = useActiveHabits();
  const habitLogs = useHabitStore((state) => state.logs);
  const transactions = useProfileStore((state) => state.transactions);
  const { level, percent, xpIntoLevel, xpForLevel } = useLevelProgress();

  const [isCreateOpen, setCreateOpen] = useState(false);

  const todayIso = today();
  const todaysTasks = tasksForDate(tasks, todayIso);
  const carriedOver = overdueFromPreviousDays(tasks, todayIso);
  const stats = completionStats(todaysTasks);
  const xpToday = xpEarnedOn(transactions, todayIso);

  const habitsDoneToday = habits.filter((h) => isCheckedIn(habitLogs, h.id, todayIso)).length;

  // Percentual do dia: sobre tudo que foi planejado para hoje, e não só sobre o avaliado.
  // Aqui a pergunta é "quanto do meu dia eu executei", então o que ainda está aberto
  // precisa pesar no denominador.
  const dayProgress =
    todaysTasks.length === 0 ? 0 : Math.round((stats.completed / todaysTasks.length) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Hoje</h1>
          <p className="mt-0.5 text-sm capitalize text-neutral-500">
            {formatLongDate(todayIso)}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Nova tarefa
        </Button>
      </header>

      {/* --- Resumo do dia --- */}
      <section
        aria-label="Resumo do dia"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <SummaryTile
          value={`${dayProgress}%`}
          label="Executado"
          detail={`${stats.completed} de ${todaysTasks.length}`}
          progress={dayProgress}
        />
        <SummaryTile
          value={String(stats.upcoming)}
          label="Pendentes"
          detail={stats.unevaluated > 0 ? `${stats.unevaluated} sem registro` : 'Em dia'}
        />
        <SummaryTile
          value={`${habitsDoneToday}/${habits.length}`}
          label="Hábitos"
          detail={habits.length === 0 ? 'Nenhum ativo' : 'Check-ins de hoje'}
        />
        <SummaryTile
          value={`+${xpToday}`}
          label="XP hoje"
          detail={`Nível ${level} · ${xpIntoLevel}/${xpForLevel}`}
          progress={percent}
        />
      </section>

      {/* --- Pendências de dias anteriores --- */}
      {carriedOver.length > 0 && (
        <section aria-labelledby="pendencias" className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <h2 id="pendencias" className="text-sm font-semibold text-neutral-900">
              Ficaram sem registro
            </h2>
            <span className="text-xs text-neutral-500">
              {carriedOver.length} de dias anteriores
            </span>
          </div>
          <p className="text-sm text-neutral-500">
            Registrar o que aconteceu — inclusive quando não aconteceu — é o que permite
            encontrar padrões depois.
          </p>
          <div className="space-y-2.5">
            {carriedOver.slice(0, 5).map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {/* --- Timeline --- */}
      <section aria-labelledby="timeline" className="space-y-3">
        <h2 id="timeline" className="text-sm font-semibold text-neutral-900">
          Timeline do dia
        </h2>

        {todaysTasks.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={32} strokeWidth={1.5} />}
            title="Nenhuma atividade planejada para hoje"
            description="Comece pelo que você já sabe que vai fazer. O valor do NoteFlow aparece quando existe histórico."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Criar primeira tarefa
              </Button>
            }
          />
        ) : (
          <ol className="space-y-2.5">
            {todaysTasks.map((task) => (
              <li key={task.id} className="flex gap-3">
                <span className="w-11 shrink-0 pt-4 text-right text-xs font-medium tabular-nums text-neutral-400">
                  {task.scheduled_time ?? '—'}
                </span>
                <div className="min-w-0 flex-1">
                  <TaskItem task={task} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* --- Hábitos --- */}
      {habits.length > 0 && (
        <section aria-labelledby="habitos" className="space-y-3">
          <h2 id="habitos" className="text-sm font-semibold text-neutral-900">
            Hábitos de hoje
          </h2>
          <div className="space-y-2.5">
            {habits.slice(0, 3).map((habit) => (
              <HabitItem key={habit.id} habit={habit} />
            ))}
          </div>
        </section>
      )}

      <CreateTaskModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

interface SummaryTileProps {
  value: string;
  label: string;
  detail: string;
  progress?: number;
}

function SummaryTile({ value, label, detail, progress }: SummaryTileProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5">
      <p className="text-xl font-semibold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-neutral-700">{label}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-neutral-900 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <p className="mt-1.5 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

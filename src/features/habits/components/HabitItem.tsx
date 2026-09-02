/**
 * Cartão de hábito.
 *
 * A sequência exibida aqui é calculada a partir dos check-ins a cada render, e não lida
 * de um contador (defeito D3). A trilha de quatorze dias mostra a consistência real —
 * inclusive as falhas — porque um número isolado de "12 dias" esconde justamente o que
 * a seção 24 quer que o usuário enxergue.
 *
 * A ausência de check-in hoje não é tratada como fracasso: o dia ainda não acabou, e a
 * seção 47 proíbe a mecânica de culpa.
 */

import { Check, Flame } from 'lucide-react';
import type { Habit } from '../../../types/domain';
import {
  habitCheckInDates,
  isCheckedIn,
  streakOptionsOf,
  useHabitStore,
} from '../../../store/useHabitStore';
import { toast } from '../../../store/useToastStore';
import { calculateStreak, streakCalendar } from '../../../domain/streaks';
import { today } from '../../../lib/date';
import { cn } from '../../../lib/utils';

const FREQUENCY_LABELS: Record<Habit['frequency'], string> = {
  daily: 'Todos os dias',
  weekdays: 'Dias úteis',
  weekly: 'Alguns dias da semana',
};

interface Props {
  habit: Habit;
}

export function HabitItem({ habit }: Props) {
  const logs = useHabitStore((state) => state.logs);
  const checkIn = useHabitStore((state) => state.checkIn);
  const undoCheckIn = useHabitStore((state) => state.undoCheckIn);

  const todayIso = today();
  const dates = habitCheckInDates(logs, habit.id);
  const options = streakOptionsOf(habit);

  const streak = calculateStreak(dates, options, todayIso);
  const calendar = streakCalendar(dates, options, todayIso, 14);
  const doneToday = isCheckedIn(logs, habit.id, todayIso);

  function handleToggle() {
    if (doneToday) {
      undoCheckIn(habit.id, todayIso);
      toast('Check-in desfeito');
      return;
    }

    const result = checkIn(habit.id, todayIso);
    if (!result) return;

    if (result.leveledUp) {
      toast(`Nível ${result.level} alcançado`, `+${result.awarded} XP`, 'celebration');
    } else {
      toast(habit.title, `+${result.awarded} XP`, 'success');
    }
  }

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium leading-snug text-neutral-900">
            {habit.title}
          </h3>
          {habit.description && (
            <p className="mt-1 text-sm text-neutral-500">{habit.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>{FREQUENCY_LABELS[habit.frequency]}</span>
            {habit.preferred_time && (
              <span className="tabular-nums">{habit.preferred_time}</span>
            )}
            <span className="tabular-nums">{habit.xp_reward} XP</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={doneToday}
          aria-label={doneToday ? `Desfazer check-in de ${habit.title}` : `Marcar ${habit.title} como feito hoje`}
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
            doneToday
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-neutral-300 bg-white text-neutral-400 hover:border-neutral-900 hover:text-neutral-900',
          )}
        >
          <Check size={20} strokeWidth={doneToday ? 2.5 : 2} />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-neutral-100 pt-3">
        <div
          className="flex items-center gap-[3px]"
          role="img"
          aria-label={`Últimos 14 dias: ${calendar.filter((d) => d.done).length} check-ins`}
        >
          {calendar.map((day) => (
            <span
              key={day.date}
              title={day.date}
              className={cn(
                'h-5 w-2 rounded-full',
                day.done
                  ? 'bg-emerald-600'
                  : day.expected
                    ? 'bg-neutral-200'
                    : // Dia fora da frequência do hábito: não é falha, então não é marcado
                      // com a mesma cor de um dia esperado e não cumprido.
                      'bg-neutral-100',
              )}
            />
          ))}
        </div>

        {streak > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            <Flame size={15} className="text-amber-500" strokeWidth={2} aria-hidden="true" />
            <span className="tabular-nums">{streak}</span>
            <span className="font-normal text-neutral-500">
              {habit.frequency === 'weekly'
                ? streak === 1
                  ? 'semana'
                  : 'semanas'
                : streak === 1
                  ? 'dia'
                  : 'dias'}
            </span>
          </span>
        ) : (
          <span className="text-sm text-neutral-400">Sem sequência ativa</span>
        )}
      </div>
    </article>
  );
}

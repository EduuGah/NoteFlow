/**
 * Store de hábitos.
 *
 * Correção do defeito D3: `current_streak` deixa de existir como campo. A sequência é
 * derivada dos check-ins por `src/domain/streaks.ts`. Antes, `current_streak + 1` a cada
 * conclusão exibia "52 dias" para quem marcava o hábito uma vez por semana — e como as
 * seções 23–27 constroem insights sobre consistência, a métrica mentirosa contaminava
 * todo o resto.
 *
 * Um hábito não materializa tarefa (docs/00, A3): o check-in é próprio, com XP próprio,
 * para que o mesmo evento não seja contado duas vezes na taxa de conclusão.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createStorePersist } from './persist';
import { recordEvent } from './useEventStore';
import { useProfileStore } from './useProfileStore';
import type { AwardXpResult } from './useProfileStore';
import { createId } from '../lib/id';
import { LOCAL_USER_ID } from '../constants/app';
import { calculateHabitXp } from '../domain/xp';
import type { StreakOptions } from '../domain/streaks';
import type {
  ClockTime,
  Habit,
  HabitFrequency,
  HabitLog,
  IsoDate,
  TaskDifficulty,
  Weekday,
} from '../types/domain';

export interface NewHabitInput {
  title: string;
  description?: string | null;
  frequency: HabitFrequency;
  weekdays?: Weekday[];
  preferred_time?: ClockTime | null;
  difficulty: TaskDifficulty;
  category_id?: string | null;
}

export type HabitPatch = Partial<
  Pick<
    Habit,
    | 'title'
    | 'description'
    | 'frequency'
    | 'weekdays'
    | 'preferred_time'
    | 'difficulty'
    | 'category_id'
  >
>;

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];

  createHabit: (input: NewHabitInput) => Habit;
  updateHabit: (id: string, patch: HabitPatch) => void;
  /**
   * Arquiva em vez de apagar: os check-ins passados continuam alimentando os relatórios.
   * Apagar o hábito reescreveria o histórico, contra a seção 45.
   */
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  deleteHabit: (id: string) => void;

  /** `null` quando já havia check-in naquela data. */
  checkIn: (habitId: string, date: IsoDate) => AwardXpResult | null;
  undoCheckIn: (habitId: string, date: IsoDate) => void;

  reset: () => void;
}

export const useHabitStore = create<HabitState>()(
  createStorePersist(
    (set, get) => ({
      habits: [],
      logs: [],

      createHabit: (input) => {
        const habit: Habit = {
          id: createId(),
          user_id: LOCAL_USER_ID,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          frequency: input.frequency,
          weekdays: input.weekdays ?? [],
          category_id: input.category_id ?? null,
          preferred_time: input.preferred_time ?? null,
          difficulty: input.difficulty,
          xp_reward: calculateHabitXp(input.difficulty),
          is_archived: false,
          created_at: new Date().toISOString(),
        };

        set((state) => ({ habits: [...state.habits, habit] }));
        recordEvent('HABIT_CREATED', habit.id, { title: habit.title });
        return habit;
      },

      updateHabit: (id, patch) =>
        set((state) => ({
          habits: state.habits.map((h) =>
            h.id === id
              ? {
                  ...h,
                  ...patch,
                  // Só reprecifica quando a dificuldade muda. Check-ins já creditados
                  // mantêm o valor que valia no dia em que aconteceram.
                  xp_reward: patch.difficulty
                    ? calculateHabitXp(patch.difficulty)
                    : h.xp_reward,
                }
              : h,
          ),
        })),

      archiveHabit: (id) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, is_archived: true } : h)),
        })),

      restoreHabit: (id) =>
        set((state) => ({
          habits: state.habits.map((h) => (h.id === id ? { ...h, is_archived: false } : h)),
        })),

      deleteHabit: (id) => {
        const { logs } = get();
        // Revoga o XP de cada check-in para que o total continue batendo com o histórico.
        logs
          .filter((l) => l.habit_id === id)
          .forEach((l) => useProfileStore.getState().revokeXp('habit', id, l.date));

        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
          logs: state.logs.filter((l) => l.habit_id !== id),
        }));
      },

      checkIn: (habitId, date) => {
        const { habits, logs } = get();
        const habit = habits.find((h) => h.id === habitId);
        if (!habit) return null;

        // Um check-in por hábito por dia. Marcar de novo não deve render XP extra.
        if (logs.some((l) => l.habit_id === habitId && l.date === date)) return null;

        const log: HabitLog = {
          id: createId(),
          habit_id: habitId,
          user_id: LOCAL_USER_ID,
          date,
          logged_at: new Date().toISOString(),
        };

        set((state) => ({ logs: [...state.logs, log] }));
        recordEvent('HABIT_COMPLETED', habitId, { date, xp: habit.xp_reward });

        return useProfileStore.getState().awardXp({
          amount: habit.xp_reward,
          sourceType: 'habit',
          sourceId: habitId,
          // A data distingue as ocorrências: o check-in de hoje e o de ontem são créditos
          // diferentes do mesmo hábito, e ambos precisam passar pela idempotência.
          occurrenceKey: date,
        });
      },

      undoCheckIn: (habitId, date) => {
        set((state) => ({
          logs: state.logs.filter((l) => !(l.habit_id === habitId && l.date === date)),
        }));
        useProfileStore.getState().revokeXp('habit', habitId, date);
        recordEvent('HABIT_UNDONE', habitId, { date });
      },

      reset: () => set({ habits: [], logs: [] }),
    }),
    { name: 'habits', version: 1 },
  ),
);

// --- Seletores ------------------------------------------------------------

/** Datas de check-in de um hábito, em ordem crescente. Entrada das funções de streak. */
export function habitCheckInDates(logs: HabitLog[], habitId: string): IsoDate[] {
  return logs
    .filter((l) => l.habit_id === habitId)
    .map((l) => l.date)
    .sort();
}

/** Opções de streak a partir do hábito. Mantém a conversão num lugar só. */
export function streakOptionsOf(habit: Habit): StreakOptions {
  return { frequency: habit.frequency, weekdays: habit.weekdays };
}

export function isCheckedIn(logs: HabitLog[], habitId: string, date: IsoDate): boolean {
  return logs.some((l) => l.habit_id === habitId && l.date === date);
}

/**
 * Hábitos ativos.
 *
 * Exposto como hook, e não como seletor solto, de propósito. `filter` devolve um array
 * novo a cada chamada; passado direto para `useHabitStore(...)`, o zustand v5 enxerga uma
 * referência diferente em todo render e entra em laço infinito ("Maximum update depth
 * exceeded"). `useShallow` compara elemento a elemento e corta o laço — e ter isso num
 * único lugar impede que o erro volte na próxima tela que precisar da lista.
 */
export function useActiveHabits(): Habit[] {
  return useHabitStore(useShallow((state) => state.habits.filter((h) => !h.is_archived)));
}

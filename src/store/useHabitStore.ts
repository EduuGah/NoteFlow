import { create } from 'zustand';
import { Habit, HabitLog } from '../types/database.types';

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  addHabit: (habitData: Omit<Habit, 'id' | 'user_id' | 'created_at' | 'current_streak'>) => void;
  completeHabit: (habitId: string, dateStr: string) => void;
}

export const useHabitStore = create<HabitState>((set) => ({
  habits: [],
  logs: [],
  
  addHabit: (habitData) => set((state) => {
    const newHabit: Habit = {
      ...habitData,
      id: crypto.randomUUID(),
      user_id: 'local-user',
      current_streak: 0,
      created_at: new Date().toISOString(),
    };
    return { habits: [newHabit, ...state.habits] };
  }),

  completeHabit: (habitId, dateStr) => set((state) => {
    // Prevent completing the same habit multiple times on the same date
    const alreadyCompleted = state.logs.some(
      l => l.habit_id === habitId && l.completed_at === dateStr
    );
    if (alreadyCompleted) return state;

    const newLog: HabitLog = {
      id: crypto.randomUUID(),
      habit_id: habitId,
      user_id: 'local-user',
      completed_at: dateStr,
    };

    return {
      logs: [newLog, ...state.logs],
      habits: state.habits.map(h => 
        h.id === habitId 
          ? { ...h, current_streak: h.current_streak + 1 } 
          : h
      )
    };
  })
}));

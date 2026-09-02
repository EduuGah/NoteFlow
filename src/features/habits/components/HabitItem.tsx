import { Flame, Check } from 'lucide-react';
import { Habit } from '../../../types/database.types';
import { useHabitStore } from '../../../store/useHabitStore';
import { useProfileStore } from '../../../store/useProfileStore';

interface Props {
  habit: Habit;
}

export function HabitItem({ habit }: Props) {
  const completeHabit = useHabitStore(state => state.completeHabit);
  const logs = useHabitStore(state => state.logs);
  const addXp = useProfileStore(state => state.addXp);

  const todayStr = new Date().toISOString().split('T')[0];
  const isCompletedToday = logs.some(l => l.habit_id === habit.id && l.completed_at === todayStr);

  const handleComplete = () => {
    if (isCompletedToday) return;
    completeHabit(habit.id, todayStr);
    addXp(habit.xp_reward);
  };

  return (
    <div className={`p-5 bg-white border rounded-xl flex items-center justify-between transition-all ${
      isCompletedToday ? 'border-orange-200 bg-orange-50/20' : 'border-neutral-200 hover:shadow-sm'
    }`}>
      <div>
        <h3 className="font-semibold text-neutral-900 mb-1">{habit.title}</h3>
        {habit.description && <p className="text-sm text-neutral-500 mb-3">{habit.description}</p>}
        
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
            <Flame size={14} className={habit.current_streak > 0 ? "fill-orange-500" : ""} />
            {habit.current_streak} {habit.current_streak === 1 ? 'dia' : 'dias'}
          </span>
          <span className="text-neutral-500">
            {habit.frequency === 'daily' ? 'Diário' : habit.frequency === 'weekdays' ? 'Dias úteis' : 'Semanal'}
          </span>
        </div>
      </div>

      <button 
        onClick={handleComplete}
        disabled={isCompletedToday}
        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-sm ${
          isCompletedToday 
            ? 'bg-orange-100 text-orange-600 cursor-default' 
            : 'bg-neutral-900 text-white hover:bg-orange-500 hover:-translate-y-0.5'
        }`}
      >
        <Check size={20} className={isCompletedToday ? "stroke-[3]" : ""} />
      </button>
    </div>
  );
}

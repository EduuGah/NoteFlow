import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { CreateHabitModal } from '../features/habits/components/CreateHabitModal';
import { HabitItem } from '../features/habits/components/HabitItem';

export function Habits() {
  const habits = useHabitStore(state => state.habits);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Hábitos</h1>
          <p className="text-neutral-500 mt-1">Desenvolva consistência diariamente.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={16} /> Novo Hábito
        </button>
      </header>

      <div className="space-y-6 mt-8">
        {habits.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-neutral-200 rounded-xl bg-white">
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhum hábito rastreado</h3>
            <p className="text-sm text-neutral-500 mb-4">Que tal começar a ler 10 páginas por dia?</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-colors"
            >
              Criar primeiro hábito
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {habits.map(habit => (
              <HabitItem key={habit.id} habit={habit} />
            ))}
          </div>
        )}
      </div>

      <CreateHabitModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}

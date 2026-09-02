import { useState } from 'react';
import { X } from 'lucide-react';
import { HabitFrequency } from '../../../types/database.types';
import { useHabitStore } from '../../../store/useHabitStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateHabitModal({ isOpen, onClose }: Props) {
  const addHabit = useHabitStore(state => state.addHabit);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addHabit({
      title,
      description: description || null,
      frequency,
      xp_reward: 20, // fixed 20 XP for habits per PRD
    });
    
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Novo Hábito</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Título</label>
            <input 
              type="text" 
              autoFocus
              required
              placeholder="Ex: Ler 20 minutos"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Frequência</label>
            <select 
              value={frequency}
              onChange={e => setFrequency(e.target.value as HabitFrequency)}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
            >
              <option value="daily">Diariamente</option>
              <option value="weekdays">Dias úteis</option>
              <option value="weekly">Semanalmente</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Descrição (Opcional)</label>
            <textarea 
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Por que este hábito é importante?"
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm resize-none"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Criar Hábito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

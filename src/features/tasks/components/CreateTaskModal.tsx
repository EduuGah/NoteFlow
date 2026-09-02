import { useState } from 'react';
import { X } from 'lucide-react';
import { TaskPriority, TaskDifficulty } from '../../../types/database.types';
import { useTaskStore } from '../../../store/useTaskStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({ isOpen, onClose }: Props) {
  const addTask = useTaskStore(state => state.addTask);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('easy');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title,
      description: description || null,
      scheduled_date: date || null,
      scheduled_time: time || null,
      duration_estimated: 60, // Default for now
      priority,
      difficulty,
      category_id: null,
    });
    
    // Reset and close
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h2 className="text-lg font-semibold text-neutral-900">Nova Tarefa</h2>
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
              placeholder="Ex: Treino de pernas"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Data</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Horário</label>
              <input 
                type="time" 
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Dificuldade</label>
              <select 
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as TaskDifficulty)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
              >
                <option value="easy">Fácil (10 XP)</option>
                <option value="medium">Média (25 XP)</option>
                <option value="hard">Difícil (50 XP)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Prioridade</label>
              <select 
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition-all sm:text-sm"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-neutral-700">Descrição (Opcional)</label>
            <textarea 
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detalhes adicionais..."
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
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { Task } from '../../../types/database.types';
import { useTaskStore } from '../../../store/useTaskStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { FailTaskModal } from './FailTaskModal';

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const completeTask = useTaskStore(state => state.completeTask);
  const addXp = useProfileStore(state => state.addXp);
  const [isFailModalOpen, setIsFailModalOpen] = useState(false);

  const handleComplete = () => {
    completeTask(task.id);
    addXp(task.xp_reward);
  };

  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  
  const isActionable = task.status === 'planned' || task.status === 'in_progress';

  return (
    <>
      <div className={`p-4 bg-white border rounded-xl transition-all ${
        isCompleted ? 'border-green-100 bg-green-50/30 opacity-75' : 
        isFailed ? 'border-red-100 bg-red-50/30' : 
        'border-neutral-200 hover:shadow-sm'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-medium text-base truncate ${
                isCompleted ? 'text-neutral-500 line-through' : 'text-neutral-900'
              }`}>
                {task.title}
              </h3>
              {task.priority === 'high' && <span className="w-2 h-2 rounded-full bg-orange-400" title="Alta prioridade" />}
              {task.priority === 'critical' && <span className="w-2 h-2 rounded-full bg-red-500" title="Prioridade crítica" />}
            </div>
            
            {task.description && (
              <p className="text-sm text-neutral-500 line-clamp-2 mb-3">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1 text-neutral-500 bg-neutral-100 px-2 py-1 rounded-md">
                <Clock size={12} />
                {task.scheduled_time || 'Sem horário'}
              </span>
              <span className="text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                +{task.xp_reward} XP
              </span>
              {isFailed && (
                <span className="text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> Não realizada
                </span>
              )}
              {isCompleted && (
                <span className="text-green-600 flex items-center gap-1">
                  <Check size={12} /> Concluída
                </span>
              )}
            </div>
          </div>

          {isActionable && (
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setIsFailModalOpen(true)}
                title="Não realizada"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
              >
                <X size={16} />
              </button>
              <button 
                onClick={handleComplete}
                title="Concluir"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-green-600 hover:shadow-sm transition-all"
              >
                <Check size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <FailTaskModal 
        taskId={task.id} 
        isOpen={isFailModalOpen} 
        onClose={() => setIsFailModalOpen(false)} 
      />
    </>
  );
}

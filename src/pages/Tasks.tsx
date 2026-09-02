import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskStore } from '../store/useTaskStore';
import { TaskItem } from '../features/tasks/components/TaskItem';
import { CreateTaskModal } from '../features/tasks/components/CreateTaskModal';

export function Tasks() {
  const tasks = useTaskStore(state => state.tasks);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'today' | 'all'>('today');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredTasks = tasks.filter(task => {
    if (filter === 'today') {
      return task.scheduled_date === todayStr;
    }
    return true;
  });

  const activeTasks = filteredTasks.filter(t => t.status === 'planned' || t.status === 'in_progress');
  const finishedTasks = filteredTasks.filter(t => t.status === 'completed' || t.status === 'failed');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Tarefas</h1>
          <p className="text-neutral-500 mt-1">Gerencie seu planejamento diário.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nova Tarefa
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-neutral-200 pb-px">
        <button 
          onClick={() => setFilter('today')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'today' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Hoje
        </button>
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all' ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Todas
        </button>
      </div>

      <div className="space-y-6">
        {activeTasks.length === 0 && finishedTasks.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-neutral-200 rounded-xl bg-white">
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Nenhuma tarefa encontrada</h3>
            <p className="text-sm text-neutral-500 mb-4">Que tal planejar algo novo agora?</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-4 py-2 rounded-lg transition-colors"
            >
              Criar primeira tarefa
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {activeTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Pendentes</h2>
                <div className="grid grid-cols-1 gap-3">
                  {activeTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {finishedTasks.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Concluídas / Falhas</h2>
                <div className="grid grid-cols-1 gap-3 opacity-75">
                  {finishedTasks.map(task => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateTaskModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}

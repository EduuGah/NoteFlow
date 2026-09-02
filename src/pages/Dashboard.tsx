import { useTaskStore } from '../store/useTaskStore';
import { useProfileStore } from '../store/useProfileStore';
import { useHabitStore } from '../store/useHabitStore';
import { CheckCircle2, Circle, Clock, Flame } from 'lucide-react';
import { TaskItem } from '../features/tasks/components/TaskItem';

export function Dashboard() {
  const { tasks } = useTaskStore();
  const { level, xpTotal, xpCurrent } = useProfileStore();
  const { habits, logs: habitLogs } = useHabitStore();

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Tasks for today
  const todaysTasks = tasks.filter(t => t.scheduled_date === todayStr);
  const completedTasks = todaysTasks.filter(t => t.status === 'completed');
  const completionRate = todaysTasks.length > 0 
    ? Math.round((completedTasks.length / todaysTasks.length) * 100) 
    : 0;

  // Habits for today (all active habits)
  const completedHabitsToday = habitLogs.filter(l => l.completed_at === todayStr).length;

  // Sort tasks chronologically for the timeline
  const sortedTasks = [...todaysTasks].sort((a, b) => {
    const timeA = a.scheduled_time || '23:59';
    const timeB = b.scheduled_time || '23:59';
    return timeA.localeCompare(timeB);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Bem-vindo ao NoteFlow. Seu progresso pessoal começa aqui.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Hoje (Tarefas)</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">{completionRate}%</span>
            <span className="text-sm text-neutral-500">concluído</span>
          </div>
          <div className="w-full bg-neutral-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-neutral-900 h-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
          <p className="text-sm text-neutral-400 mt-3">{completedTasks.length} de {todaysTasks.length} atividades</p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm relative overflow-hidden">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Seu Perfil</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">Nv. {level}</span>
            <span className="text-sm text-neutral-500">{xpTotal} XP total</span>
          </div>
          <div className="w-full bg-blue-50 h-2 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${(xpCurrent / (level * 100)) * 100}%` }} />
          </div>
          <p className="text-sm text-neutral-400 mt-3">{xpCurrent} / {level * 100} XP para o Nível {level + 1}</p>
        </div>
        
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Hábitos Diários</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-orange-500">{completedHabitsToday}</span>
            <span className="text-sm text-neutral-500">de {habits.length} concluídos</span>
          </div>
          <div className="flex gap-1 mt-4">
            {habits.length > 0 ? habits.slice(0, 5).map(habit => {
              const isDone = habitLogs.some(l => l.habit_id === habit.id && l.completed_at === todayStr);
              return (
                <div key={habit.id} className={`w-2 h-8 rounded-full ${isDone ? 'bg-orange-500' : 'bg-neutral-200'}`} title={habit.title} />
              )
            }) : (
               <p className="text-sm text-neutral-400">Nenhum hábito ativo.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Timeline do Dia</h2>
            <span className="text-sm font-medium text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          
          <div className="bg-white border border-neutral-200 rounded-xl shadow-sm p-6">
            {sortedTasks.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">
                <Clock size={40} className="mx-auto mb-3 text-neutral-300" strokeWidth={1.5} />
                <p>Nenhuma atividade planejada para hoje.</p>
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-200 before:to-transparent">
                {sortedTasks.map(task => (
                  <div key={task.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-neutral-100 text-neutral-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                      {task.status === 'completed' ? <CheckCircle2 className="text-green-600" size={20} /> : <Circle size={16} />}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)]">
                      <TaskItem task={task} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Acesso Rápido</h2>
          
          <div className="bg-neutral-900 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-semibold text-lg mb-1">Mantenha a Constância</h3>
              <p className="text-neutral-400 text-sm mb-4">Complete as tarefas diárias e aumente seu score. O MVP já está acompanhando o seu XP.</p>
              <div className="flex items-center gap-2 text-sm">
                <Flame size={16} className="text-orange-500" />
                <span className="font-medium text-orange-400">Streak Shield</span>
                <span className="text-neutral-500 text-xs ml-auto">(Em breve)</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <Flame size={120} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

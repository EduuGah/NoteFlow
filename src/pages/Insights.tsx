import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useProfileStore } from '../store/useProfileStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, AlertCircle, Target, Award } from 'lucide-react';

const FAIL_REASONS_MAP: Record<string, string> = {
  'time': 'Falta de tempo',
  'energy': 'Cansaço/Energia',
  'priority': 'Surgiu urgência',
  'forgot': 'Esqueci',
  'other': 'Outro'
};

export function Insights() {
  const { tasks, logs } = useTaskStore();
  const { habits, logs: habitLogs } = useHabitStore();
  const { level, xpTotal } = useProfileStore();

  // Metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const pendingTasks = tasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Pie Chart Data: Status Distribution
  const statusData = [
    { name: 'Concluídas', value: completedTasks, color: '#16a34a' },
    { name: 'Falhas', value: failedTasks, color: '#dc2626' },
    { name: 'Pendentes', value: pendingTasks, color: '#d4d4d4' },
  ].filter(d => d.value > 0);

  // Bar Chart Data: Failure Reasons
  const failedLogs = logs.filter(l => l.action === 'failed' && l.fail_reason);
  
  const failReasonsCount = failedLogs.reduce((acc, log) => {
    const reason = log.fail_reason!;
    acc[reason] = (acc[reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const failData = Object.entries(failReasonsCount)
    .map(([key, value]) => ({
      name: FAIL_REASONS_MAP[key] || key,
      count: value
    }))
    .sort((a, b) => b.count - a.count);

  const topFailReason = failData.length > 0 ? failData[0].name : 'Nenhuma';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Insights</h1>
        <p className="text-neutral-500 mt-1">Analise seus padrões de produtividade e consistência.</p>
      </header>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500">
            <Target size={18} />
            <h2 className="text-sm font-medium uppercase tracking-wider">Taxa de Sucesso</h2>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{completionRate}%</p>
          <p className="text-sm text-neutral-400 mt-1">Das tarefas planejadas</p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500">
            <AlertCircle size={18} />
            <h2 className="text-sm font-medium uppercase tracking-wider">Principal Obstáculo</h2>
          </div>
          <p className="text-xl font-bold text-neutral-900 truncate">{topFailReason}</p>
          <p className="text-sm text-neutral-400 mt-1">Maior causa de falhas</p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500">
            <Award size={18} />
            <h2 className="text-sm font-medium uppercase tracking-wider">Experiência</h2>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{xpTotal} XP</p>
          <p className="text-sm text-neutral-400 mt-1">Nível atual: {level}</p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-neutral-500">
            <TrendingUp size={18} />
            <h2 className="text-sm font-medium uppercase tracking-wider">Hábitos Ativos</h2>
          </div>
          <p className="text-3xl font-bold text-neutral-900">{habits.length}</p>
          <p className="text-sm text-neutral-400 mt-1">{habitLogs.length} execuções totais</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-neutral-200 rounded-xl shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">Distribuição de Tarefas</h3>
          {statusData.length > 0 ? (
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${value} tarefas`, 'Quantidade']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              Nenhum dado suficiente para gerar o gráfico.
            </div>
          )}
        </div>

        <div className="bg-white p-6 border border-neutral-200 rounded-xl shadow-sm flex flex-col min-h-[400px]">
          <h3 className="text-lg font-semibold text-neutral-900 mb-6">Motivos de Falha</h3>
          {failData.length > 0 ? (
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e5e5" />
                  <XAxis type="number" allowDecimals={false} stroke="#a3a3a3" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#525252" fontSize={13} tickLine={false} axisLine={false} width={100} />
                  <Tooltip 
                    cursor={{fill: '#f5f5f5'}}
                    formatter={(value: any) => [`${value} vezes`, 'Ocorrências']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#dc2626" radius={[0, 4, 4, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
              Ótimo! Você ainda não registrou falhas justificadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

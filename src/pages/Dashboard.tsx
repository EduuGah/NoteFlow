export function Dashboard() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500 mt-1">Bem-vindo ao NoteFlow. Seu progresso pessoal começa aqui.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Hoje</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">0%</span>
            <span className="text-sm text-neutral-500">concluído</span>
          </div>
          <p className="text-sm text-neutral-400 mt-4">0 de 0 atividades</p>
        </div>

        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">XP Adquirido</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">+0</span>
            <span className="text-sm text-neutral-500">XP hoje</span>
          </div>
          <p className="text-sm text-neutral-400 mt-4">Nível 1 • 0 XP total</p>
        </div>
        
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Sequência</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-neutral-900">0</span>
            <span className="text-sm text-neutral-500">dias</span>
          </div>
          <p className="text-sm text-neutral-400 mt-4">Constância é a chave.</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm min-h-[400px] flex items-center justify-center">
        <div className="text-center text-neutral-500">
          <p>O MVP está sendo construído.</p>
          <p className="text-sm">Logo suas tarefas aparecerão aqui.</p>
        </div>
      </div>
    </div>
  );
}

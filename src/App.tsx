import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          {/* Outras rotas serão adicionadas aqui nas próximas fases */}
          <Route path="tasks" element={<div className="p-8 text-neutral-500">Módulo de Tarefas em construção...</div>} />
          <Route path="habits" element={<div className="p-8 text-neutral-500">Módulo de Hábitos em construção...</div>} />
          <Route path="insights" element={<div className="p-8 text-neutral-500">Módulo de Insights em construção...</div>} />
          <Route path="settings" element={<div className="p-8 text-neutral-500">Configurações em construção...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

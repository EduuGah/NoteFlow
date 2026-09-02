import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Tasks } from './pages/Tasks';
import { Habits } from './pages/Habits';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="habits" element={<Habits />} />
          <Route path="insights" element={<div className="p-8 text-neutral-500">Módulo de Insights em construção...</div>} />
          <Route path="settings" element={<div className="p-8 text-neutral-500">Configurações em construção...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

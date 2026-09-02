import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, BarChart2, Settings, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export function AppLayout() {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Tarefas', path: '/tasks', icon: CheckSquare },
    { name: 'Hábitos', path: '/habits', icon: Target },
    { name: 'Insights', path: '/insights', icon: BarChart2 },
    { name: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#faf9f7] font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-neutral-900 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">NF</span>
          </div>
          <span className="font-semibold text-lg tracking-tight">NoteFlow</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-neutral-100 text-neutral-900" 
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                )
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User Mini Profile Placeholder */}
        <div className="p-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
              US
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">Usuário</p>
              <p className="text-xs text-neutral-500 truncate">Nível 1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen">
        {/* Mobile Header (placeholder) */}
        <header className="md:hidden bg-white border-b border-neutral-200 p-4 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">NoteFlow</span>
          <div className="w-8 h-8 rounded-full bg-neutral-200" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

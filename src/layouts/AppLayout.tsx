/**
 * Estrutura de navegação.
 *
 * Corrige o defeito D5. A versão anterior tinha `hidden md:flex` no `<aside>` e um header
 * mobile com o título e um círculo cinza decorativo — nenhum link. Abaixo de 768px o
 * usuário ficava preso no Dashboard, sem nenhuma forma de chegar às outras telas. A seção
 * 49 diz que a experiência mobile é a prioritária, porque é durante o dia, no celular,
 * que o registro acontece.
 *
 * Solução: barra inferior fixa no mobile (alcance do polegar, alvos de 44px, respeitando
 * a área segura do aparelho) e sidebar no desktop.
 */

import { NavLink, Outlet } from 'react-router-dom';
import { BarChart2, CheckSquare, LayoutDashboard, Settings, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLevelProgress } from '../store/useProfileStore';

interface NavItem {
  name: string;
  /** Rótulo curto para a barra inferior, onde o espaço é de um dedo. */
  shortName: string;
  path: string;
  icon: typeof LayoutDashboard;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', shortName: 'Hoje', path: '/', icon: LayoutDashboard },
  { name: 'Tarefas', shortName: 'Tarefas', path: '/tasks', icon: CheckSquare },
  { name: 'Hábitos', shortName: 'Hábitos', path: '/habits', icon: Target },
  { name: 'Insights', shortName: 'Insights', path: '/insights', icon: BarChart2 },
  { name: 'Configurações', shortName: 'Ajustes', path: '/settings', icon: Settings },
];

export function AppLayout() {
  const { level, percent, xpIntoLevel, xpForLevel } = useLevelProgress();

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Salto para o conteúdo: primeira parada do Tab, exigido pela seção 62. */}
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Pular para o conteúdo
      </a>

      {/* --- Sidebar (desktop) --- */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 border-b border-neutral-100 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-xs font-bold text-white">
            NF
          </div>
          <span className="text-base font-semibold tracking-tight text-neutral-900">
            NoteFlow
          </span>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-0.5 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                  isActive
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                )
              }
            >
              <item.icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-100 p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-neutral-900">Nível {level}</span>
            <span className="text-xs tabular-nums text-neutral-500">
              {xpIntoLevel}/{xpForLevel} XP
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso para o nível ${level + 1}`}
          >
            <div
              className="h-full rounded-full bg-neutral-900 transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </aside>

      {/* --- Conteúdo --- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <span className="text-base font-semibold tracking-tight text-neutral-900">
            NoteFlow
          </span>
          <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
            Nível {level}
          </span>
        </header>

        <main
          id="conteudo"
          // O respiro inferior no mobile evita que a barra de navegação cubra o último
          // item da lista — que costuma ser justamente a tarefa da noite.
          className="flex-1 px-4 pb-24 pt-5 md:px-8 md:pb-10 md:pt-8"
        >
          <Outlet />
        </main>
      </div>

      {/* --- Barra inferior (mobile) --- */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                  'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900',
                  isActive ? 'text-neutral-900' : 'text-neutral-500',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    strokeWidth={isActive ? 2.25 : 1.75}
                    aria-hidden="true"
                  />
                  {item.shortName}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

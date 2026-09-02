/**
 * Lista de hábitos.
 *
 * Hábitos ativos e arquivados são separados: arquivar preserva o histórico nos
 * relatórios sem manter na tela um hábito que o usuário já abandonou (seção 45).
 */

import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { useActiveHabits } from '../store/useHabitStore';
import { CreateHabitModal } from '../features/habits/components/CreateHabitModal';
import { HabitItem } from '../features/habits/components/HabitItem';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function Habits() {
  const habits = useActiveHabits();
  const [isCreateOpen, setCreateOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Hábitos</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            Comportamentos que você quer repetir, e não tarefas de uma vez só.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Novo hábito
        </Button>
      </header>

      {habits.length === 0 ? (
        <EmptyState
          icon={<Target size={32} strokeWidth={1.5} />}
          title="Nenhum hábito por enquanto"
          description="Comece com um só. A sequência aparece a partir do segundo dia, e o histórico é o que dá valor ao resto do produto."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Criar primeiro hábito
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => (
            <HabitItem key={habit.id} habit={habit} />
          ))}
        </div>
      )}

      <CreateHabitModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

/**
 * Configurações.
 *
 * A seção 41 trata privacidade como requisito, não como recurso: o usuário precisa poder
 * apagar os próprios dados. Enquanto não existe backend, apagar significa limpar o
 * `localStorage` — mas a ação já existe desde agora, para que a expectativa seja essa
 * desde o começo e não uma adição posterior.
 */

import { useState } from 'react';
import { useTaskStore } from '../store/useTaskStore';
import { useHabitStore } from '../store/useHabitStore';
import { useProfileStore, useXpTotal } from '../store/useProfileStore';
import { useEventStore } from '../store/useEventStore';
import { toast } from '../store/useToastStore';
import { clearAllLocalData } from '../data/storage';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export function Settings() {
  const tasks = useTaskStore((state) => state.tasks);
  const habits = useHabitStore((state) => state.habits);
  const habitLogs = useHabitStore((state) => state.logs);
  const events = useEventStore((state) => state.events);
  const xpTotal = useXpTotal();

  const [isConfirmOpen, setConfirmOpen] = useState(false);

  function handleEraseEverything() {
    useTaskStore.getState().reset();
    useHabitStore.getState().reset();
    useProfileStore.getState().reset();
    useEventStore.getState().clear();
    clearAllLocalData();

    setConfirmOpen(false);
    toast('Todos os dados foram apagados');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Configurações</h1>
        <p className="mt-0.5 text-sm text-neutral-500">Seus dados e o estado do aplicativo.</p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Seus dados</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
          <Metric label="Tarefas" value={tasks.length} />
          <Metric label="Hábitos" value={habits.length} />
          <Metric label="Check-ins" value={habitLogs.length} />
          <Metric label="XP total" value={xpTotal} />
        </dl>
        <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          Os dados ficam apenas neste navegador, em <code>localStorage</code>. Nada é
          enviado para servidor nenhum ainda — quando a sincronização entrar, ela virá com
          autenticação e isolamento por usuário. {events.length} eventos registrados no
          histórico de auditoria.
        </p>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Apagar tudo</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Remove tarefas, hábitos, check-ins, XP e histórico deste navegador. Não há como
          desfazer.
        </p>
        <Button variant="secondary" className="mt-3" onClick={() => setConfirmOpen(true)}>
          Apagar meus dados
        </Button>
      </section>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apagar todos os dados?"
        description="Tarefas, hábitos, check-ins, XP e histórico serão removidos deste navegador. A ação não pode ser desfeita."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEraseEverything}>
              Apagar tudo
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Serão apagados {tasks.length} tarefas, {habits.length} hábitos e{' '}
          {habitLogs.length} check-ins.
        </p>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-neutral-900">{value}</dd>
    </div>
  );
}

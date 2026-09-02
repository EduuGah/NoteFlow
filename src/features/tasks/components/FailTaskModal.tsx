/**
 * Registro de não conclusão (seções 2, 8 e 25).
 *
 * É a tela mais importante do produto: sem o motivo, o histórico guarda apenas
 * "não fez", e nenhum dos insights das seções 23–27 pode ser construído.
 *
 * Duas escolhas de produto aqui:
 *
 * - **Adiar aparece junto com falhar** (seção 8). Quando a tarefa ainda vai acontecer,
 *   forçar o registro de uma falha polui o histórico com um fracasso que não houve.
 * - **Nenhum motivo vem pré-selecionado.** A versão anterior já vinha com "Falta de
 *   tempo" marcado, o que enviesa a resposta e contamina exatamente a estatística que
 *   dá sentido ao produto.
 */

import { useEffect, useState } from 'react';
import type { FailReason, Task } from '../../../types/domain';
import { useTaskStore } from '../../../store/useTaskStore';
import { toast } from '../../../store/useToastStore';
import { FAIL_REASONS, FAIL_REASON_ORDER } from '../../../constants/fail-reasons';
import { addDaysIso, formatShortDate, today } from '../../../lib/date';
import { cn } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { TextAreaField } from '../../../components/ui/Field';

interface Props {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export function FailTaskModal({ task, isOpen, onClose }: Props) {
  const failTask = useTaskStore((state) => state.failTask);
  const cancelTask = useTaskStore((state) => state.cancelTask);
  const postponeTask = useTaskStore((state) => state.postponeTask);

  const [reason, setReason] = useState<FailReason | null>(null);
  const [notes, setNotes] = useState('');

  // Limpa o formulário a cada abertura: reaproveitar a resposta anterior faria o usuário
  // registrar sem querer o motivo da tarefa passada.
  useEffect(() => {
    if (isOpen) {
      setReason(null);
      setNotes('');
    }
  }, [isOpen]);

  const tomorrow = addDaysIso(task.scheduled_date ?? today(), 1);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason) return;

    // "Não era mais necessário" é cancelamento, não falha. A seção 7 insiste na
    // distinção, e misturá-las inflaria a taxa de fracasso com decisões deliberadas.
    const isCancellation = reason === 'no_longer_necessary';
    const done = isCancellation ? cancelTask(task.id) : failTask(task.id, reason, notes);

    if (done) {
      toast(isCancellation ? 'Atividade cancelada' : 'Registro salvo');
      onClose();
    }
  }

  function handlePostpone() {
    if (postponeTask(task.id, tomorrow)) {
      toast('Adiada para ' + formatShortDate(tomorrow));
      onClose();
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="O que aconteceu?"
      description="Entender o motivo é o que permite ao NoteFlow encontrar padrões depois. Nada aqui reduz seu XP."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="fail-task-form" type="submit" disabled={!reason}>
            Registrar
          </Button>
        </>
      }
    >
      <form id="fail-task-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
          <p className="text-sm font-medium text-neutral-900">{task.title}</p>
          <p className="text-xs text-neutral-500">
            {task.scheduled_time ? `Planejada para ${task.scheduled_time}` : 'Sem horário'}
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-neutral-700">
            Por que não foi realizada?
          </span>
          <div role="radiogroup" aria-label="Motivo" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FAIL_REASON_ORDER.map((value) => {
              const selected = reason === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setReason(value)}
                  className={cn(
                    'min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:min-h-10',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                    selected
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
                  )}
                >
                  {FAIL_REASONS[value].label}
                </button>
              );
            })}
          </div>
        </div>

        <TextAreaField
          label="Observação (opcional)"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Algum detalhe que ajude a entender depois"
        />

        <div className="rounded-lg border border-neutral-200 p-3">
          <p className="text-sm text-neutral-700">Ainda pretende fazer?</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Adiar preserva o histórico e não conta como falha.
          </p>
          <Button variant="secondary" size="sm" className="mt-2.5" onClick={handlePostpone}>
            Adiar para {formatShortDate(tomorrow)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

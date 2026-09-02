/**
 * Criação de tarefa (seção 50, Quick Add).
 *
 * "Não obrigar o usuário a preencher 15 campos." Título, data e horário ficam visíveis;
 * dificuldade, prioridade e duração ficam num bloco de detalhes recolhido, com padrões
 * que já produzem uma tarefa válida. Quem quiser só o título aperta Enter.
 *
 * A duração deixou de ser `60` fixo no código (defeito D10): ela entra na fórmula de XP,
 * então gravar 60 para todo mundo distorcia a pontuação de toda tarefa criada.
 */

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TaskDifficulty, TaskPriority } from '../../../types/domain';
import { useTaskStore } from '../../../store/useTaskStore';
import { toast } from '../../../store/useToastStore';
import {
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../../constants/task';
import { calculateTaskXp } from '../../../domain/xp';
import { today } from '../../../lib/date';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { ChoiceGroup, SelectField, TextAreaField, TextField } from '../../../components/ui/Field';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Data pré-selecionada quando a criação parte de um dia específico da agenda. */
  defaultDate?: string;
}

export function CreateTaskModal({ isOpen, onClose, defaultDate }: Props) {
  const createTask = useTaskStore((state) => state.createTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate ?? today());
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setDate(defaultDate ?? today());
    setTime('');
    setDuration(null);
    setPriority('medium');
    setDifficulty('medium');
    setShowDetails(false);
  }, [isOpen, defaultDate]);

  // Mostrado antes de salvar para que a regra de pontuação seja visível, e não um número
  // que aparece do nada depois de concluir.
  const previewXp = calculateTaskXp({ difficulty, priority, durationMinutes: duration });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    createTask({
      title,
      description,
      scheduled_date: date || null,
      scheduled_time: time || null,
      duration_estimated: duration,
      priority,
      difficulty,
    });

    toast('Tarefa criada');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova tarefa"
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-xs tabular-nums text-neutral-500">
            Vale {previewXp} XP
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="create-task-form" type="submit" disabled={!title.trim()}>
            Criar
          </Button>
        </>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="O que você vai fazer?"
          required
          autoFocus
          placeholder="Ex.: Treino de pernas"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Data"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <TextField
            label="Horário"
            type="time"
            value={time}
            hint="Opcional"
            onChange={(event) => setTime(event.target.value)}
          />
        </div>

        <div className="border-t border-neutral-100 pt-3">
          <button
            type="button"
            onClick={() => setShowDetails((value) => !value)}
            aria-expanded={showDetails}
            className="flex w-full items-center justify-between rounded-lg py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            Detalhes
            <ChevronDown
              size={16}
              className={showDetails ? 'rotate-180 transition-transform' : 'transition-transform'}
              aria-hidden="true"
            />
          </button>

          {showDetails && (
            <div className="space-y-4 pt-3">
              <ChoiceGroup
                label="Dificuldade"
                value={difficulty}
                options={DIFFICULTY_OPTIONS}
                onChange={setDifficulty}
              />
              <ChoiceGroup
                label="Prioridade"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={setPriority}
              />
              <SelectField
                label="Duração estimada"
                hint="Usada para comparar planejado e realizado."
                value={duration === null ? '' : String(duration)}
                onChange={(event) =>
                  setDuration(event.target.value === '' ? null : Number(event.target.value))
                }
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value === null ? '' : option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Descrição"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Opcional"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

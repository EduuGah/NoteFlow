/**
 * Criação de hábito.
 *
 * O XP deixou de ser `20` fixo no código: ele agora sai da mesma fórmula das tarefas,
 * a partir da dificuldade, para que hábito e tarefa sejam comparáveis na progressão.
 *
 * A frequência `weekly` exige escolher os dias — um hábito "semanal" sem dias definidos
 * não tem como ter sequência calculada de forma honesta.
 */

import { useEffect, useState } from 'react';
import type { HabitFrequency, TaskDifficulty, Weekday } from '../../../types/domain';
import { useHabitStore } from '../../../store/useHabitStore';
import { toast } from '../../../store/useToastStore';
import { DIFFICULTY_OPTIONS } from '../../../constants/task';
import { calculateHabitXp } from '../../../domain/xp';
import { WEEKDAY_LABELS } from '../../../lib/date';
import { cn } from '../../../lib/utils';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { ChoiceGroup, TextAreaField, TextField } from '../../../components/ui/Field';

const FREQUENCY_OPTIONS: { value: HabitFrequency; label: string }[] = [
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Dias específicos' },
];

const ALL_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateHabitModal({ isOpen, onClose }: Props) {
  const createHabit = useHabitStore((state) => state.createHabit);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<HabitFrequency>('daily');
  const [weekdays, setWeekdays] = useState<Weekday[]>([1, 3, 5]);
  const [preferredTime, setPreferredTime] = useState('');
  const [difficulty, setDifficulty] = useState<TaskDifficulty>('medium');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setDescription('');
    setFrequency('daily');
    setWeekdays([1, 3, 5]);
    setPreferredTime('');
    setDifficulty('medium');
  }, [isOpen]);

  const needsWeekdays = frequency === 'weekly';
  const canSubmit = title.trim().length > 0 && (!needsWeekdays || weekdays.length > 0);

  function toggleWeekday(day: Weekday) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    createHabit({
      title,
      description,
      frequency,
      weekdays: needsWeekdays ? weekdays : [],
      preferred_time: preferredTime || null,
      difficulty,
    });

    toast('Hábito criado');
    onClose();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo hábito"
      description="Um hábito é um comportamento que você quer repetir — diferente de uma tarefa, que acontece uma vez."
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-xs tabular-nums text-neutral-500">
            {calculateHabitXp(difficulty)} XP por check-in
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="create-habit-form" type="submit" disabled={!canSubmit}>
            Criar
          </Button>
        </>
      }
    >
      <form id="create-habit-form" onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Qual comportamento você quer manter?"
          required
          autoFocus
          placeholder="Ex.: Ler 20 minutos"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <ChoiceGroup
          label="Frequência"
          value={frequency}
          options={FREQUENCY_OPTIONS}
          onChange={setFrequency}
          columns={1}
        />

        {needsWeekdays && (
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-neutral-700">Dias</span>
            <div className="flex gap-1.5">
              {ALL_WEEKDAYS.map((day) => {
                const selected = weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleWeekday(day)}
                    className={cn(
                      'h-11 flex-1 rounded-lg border text-xs font-medium transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900',
                      selected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
                    )}
                  >
                    {WEEKDAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Horário preferido"
            type="time"
            hint="Opcional"
            value={preferredTime}
            onChange={(event) => setPreferredTime(event.target.value)}
          />
        </div>

        <ChoiceGroup
          label="Esforço"
          value={difficulty}
          options={DIFFICULTY_OPTIONS}
          onChange={setDifficulty}
        />

        <TextAreaField
          label="Descrição"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Opcional"
        />
      </form>
    </Modal>
  );
}

/**
 * Testes de integração das stores.
 *
 * Os testes de domínio cobrem as fórmulas; estes cobrem a costura entre elas — que é onde
 * estavam os defeitos D2 e D7. Concretamente:
 *
 * - concluir credita XP uma vez só, mesmo com clique repetido;
 * - reabrir devolve o crédito, para que o total continue batendo com o que foi feito;
 * - nível e progresso vêm do ledger, e não de campos guardados que podem divergir.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useTaskStore } from '../useTaskStore';
import { useHabitStore } from '../useHabitStore';
import { selectXpTotal, useProfileStore } from '../useProfileStore';
import { useEventStore } from '../useEventStore';
import { levelProgress } from '../../domain/levels';

function xpTotal(): number {
  return selectXpTotal(useProfileStore.getState());
}

beforeEach(() => {
  useTaskStore.getState().reset();
  useHabitStore.getState().reset();
  useProfileStore.getState().reset();
  useEventStore.getState().clear();
});

describe('conclusão de tarefa', () => {
  it('credita o XP congelado na criação', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Academia',
      scheduled_date: '2026-09-02',
      scheduled_time: '18:00',
      duration_estimated: 60,
      priority: 'medium',
      difficulty: 'hard',
    });

    const result = useTaskStore.getState().completeTask(task.id);

    expect(result?.awarded).toBe(task.xp_reward);
    expect(xpTotal()).toBe(task.xp_reward);
  });

  it('não credita duas vezes no clique repetido (defeito D2)', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Estudar',
      scheduled_date: '2026-09-02',
      scheduled_time: '20:00',
      duration_estimated: 60,
      priority: 'medium',
      difficulty: 'medium',
    });

    useTaskStore.getState().completeTask(task.id);
    const afterFirst = xpTotal();

    // A máquina de estados recusa a segunda transição.
    const second = useTaskStore.getState().completeTask(task.id);

    expect(second).toBeNull();
    expect(xpTotal()).toBe(afterFirst);
  });

  it('devolve o XP ao reabrir, e permite creditar de novo depois', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Ler',
      scheduled_date: '2026-09-02',
      scheduled_time: '22:00',
      duration_estimated: 30,
      priority: 'low',
      difficulty: 'easy',
    });

    useTaskStore.getState().completeTask(task.id);
    expect(xpTotal()).toBe(task.xp_reward);

    useTaskStore.getState().reopenTask(task.id);
    expect(xpTotal()).toBe(0);

    // Sem a revogação, a chave de idempotência recusaria esta segunda conclusão
    // legítima e o usuário ficaria sem o XP para sempre.
    useTaskStore.getState().completeTask(task.id);
    expect(xpTotal()).toBe(task.xp_reward);
  });

  it('não retira XP quando a tarefa é registrada como não realizada', () => {
    const done = useTaskStore.getState().createTask({
      title: 'Feita',
      scheduled_date: '2026-09-02',
      scheduled_time: '09:00',
      duration_estimated: 30,
      priority: 'medium',
      difficulty: 'medium',
    });
    const missed = useTaskStore.getState().createTask({
      title: 'Não feita',
      scheduled_date: '2026-09-02',
      scheduled_time: '10:00',
      duration_estimated: 30,
      priority: 'medium',
      difficulty: 'medium',
    });

    useTaskStore.getState().completeTask(done.id);
    useTaskStore.getState().failTask(missed.id, 'tiredness', 'dia puxado');

    // Seção 47: falhar registra, não pune.
    expect(xpTotal()).toBe(done.xp_reward);
    const stored = useTaskStore.getState().tasks.find((t) => t.id === missed.id);
    expect(stored?.status).toBe('failed');
    expect(stored?.fail_reason).toBe('tiredness');
    expect(stored?.fail_notes).toBe('dia puxado');
  });
});

describe('adiamento', () => {
  it('move a data, mantém a tarefa planejada e preserva a origem (docs/00, A1)', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Estudar React',
      scheduled_date: '2026-09-02',
      scheduled_time: '20:00',
      duration_estimated: 60,
      priority: 'medium',
      difficulty: 'medium',
    });

    useTaskStore.getState().postponeTask(task.id, '2026-09-03');
    useTaskStore.getState().postponeTask(task.id, '2026-09-04');

    const stored = useTaskStore.getState().tasks.find((t) => t.id === task.id);
    expect(stored?.scheduled_date).toBe('2026-09-04');
    expect(stored?.status).toBe('planned');
    expect(stored?.postpone_count).toBe(2);
    // A data original sobrevive aos adiamentos — é ela que sustenta o insight de
    // procrastinação da seção 24.
    expect(stored?.original_date).toBe('2026-09-02');
  });

  it('registra cada adiamento no event log (seções 45 e 46)', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Relatório',
      scheduled_date: '2026-09-02',
      scheduled_time: '14:00',
      duration_estimated: 60,
      priority: 'high',
      difficulty: 'medium',
    });

    useTaskStore.getState().postponeTask(task.id, '2026-09-03');

    const events = useEventStore.getState().eventsFor(task.id);
    const postponed = events.find((e) => e.type === 'TASK_POSTPONED');
    expect(postponed?.payload).toMatchObject({ from: '2026-09-02', to: '2026-09-03' });
  });

  it('preserva a mudança de horário no log, e não só o valor novo (seção 45)', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Academia',
      scheduled_date: '2026-09-02',
      scheduled_time: '18:00',
      duration_estimated: 60,
      priority: 'medium',
      difficulty: 'medium',
    });

    useTaskStore.getState().updateTask(task.id, { scheduled_time: '20:00' });

    const updated = useEventStore
      .getState()
      .eventsFor(task.id)
      .find((e) => e.type === 'TASK_UPDATED');

    expect(updated?.payload.from).toMatchObject({ time: '18:00' });
    expect(updated?.payload.to).toMatchObject({ time: '20:00' });
  });
});

describe('check-in de hábito', () => {
  it('credita uma vez por dia e permite creditar no dia seguinte', () => {
    const habit = useHabitStore.getState().createHabit({
      title: 'Ler',
      frequency: 'daily',
      difficulty: 'medium',
    });

    const first = useHabitStore.getState().checkIn(habit.id, '2026-09-02');
    const repeated = useHabitStore.getState().checkIn(habit.id, '2026-09-02');
    const nextDay = useHabitStore.getState().checkIn(habit.id, '2026-09-03');

    expect(first?.awarded).toBe(habit.xp_reward);
    // Mesmo dia, mesma chave de idempotência.
    expect(repeated).toBeNull();
    // Dia diferente é ocorrência diferente, então credita.
    expect(nextDay?.awarded).toBe(habit.xp_reward);
    expect(xpTotal()).toBe(habit.xp_reward * 2);
  });

  it('desfazer o check-in devolve o XP daquele dia apenas', () => {
    const habit = useHabitStore.getState().createHabit({
      title: 'Meditar',
      frequency: 'daily',
      difficulty: 'easy',
    });

    useHabitStore.getState().checkIn(habit.id, '2026-09-02');
    useHabitStore.getState().checkIn(habit.id, '2026-09-03');
    useHabitStore.getState().undoCheckIn(habit.id, '2026-09-03');

    expect(xpTotal()).toBe(habit.xp_reward);
    expect(useHabitStore.getState().logs).toHaveLength(1);
  });

  it('apagar o hábito remove todo o XP que ele havia gerado', () => {
    const habit = useHabitStore.getState().createHabit({
      title: 'Caminhar',
      frequency: 'daily',
      difficulty: 'medium',
    });

    useHabitStore.getState().checkIn(habit.id, '2026-09-01');
    useHabitStore.getState().checkIn(habit.id, '2026-09-02');
    useHabitStore.getState().deleteHabit(habit.id);

    expect(xpTotal()).toBe(0);
    expect(useHabitStore.getState().logs).toHaveLength(0);
  });
});

describe('nível derivado do ledger', () => {
  it('sobe de nível ao atravessar o limiar da seção 15', () => {
    const store = useTaskStore.getState();

    // 100 XP é exatamente o limiar do nível 2.
    let last: ReturnType<typeof store.completeTask> = null;
    for (let i = 0; i < 4; i += 1) {
      const task = useTaskStore.getState().createTask({
        title: `Tarefa ${i}`,
        scheduled_date: '2026-09-02',
        scheduled_time: '09:00',
        duration_estimated: 30,
        priority: 'medium',
        difficulty: 'medium',
      });
      last = useTaskStore.getState().completeTask(task.id);
    }

    expect(xpTotal()).toBe(100);
    expect(last?.leveledUp).toBe(true);
    expect(last?.level).toBe(2);
    expect(levelProgress(xpTotal()).level).toBe(2);
  });

  it('mantém total e nível coerentes depois de uma reversão', () => {
    const task = useTaskStore.getState().createTask({
      title: 'Projeto',
      scheduled_date: '2026-09-02',
      scheduled_time: '09:00',
      duration_estimated: 120,
      priority: 'critical',
      difficulty: 'hard',
    });

    useTaskStore.getState().completeTask(task.id);
    useTaskStore.getState().deleteTask(task.id);

    // Não existe campo `level` guardado que possa sobreviver ao apagamento (defeito D7).
    expect(xpTotal()).toBe(0);
    expect(levelProgress(xpTotal()).level).toBe(1);
  });
});

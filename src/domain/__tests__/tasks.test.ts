/**
 * Testes da máquina de estados de tarefa.
 *
 * O ponto mais importante é a distinção entre "não avaliada" e "falhou" (docs/00, A2).
 * Se uma tarefa vencida e não respondida contasse como falha, a taxa de conclusão passaria
 * a medir com que frequência o usuário abre o aplicativo — e não o que ele executou.
 */

import { describe, expect, it } from 'vitest';
import {
  canTransition,
  compareBySchedule,
  evaluationBucket,
  isFinished,
  isOpen,
  isOverdue,
  overdueFromPreviousDays,
  subtaskProgress,
  tasksForDate,
} from '../tasks';
import { localTime, makeTask } from './factories';
import type { Subtask } from '../../types/domain';

describe('canTransition', () => {
  it('permite as saídas normais de uma tarefa planejada', () => {
    expect(canTransition('planned', 'completed')).toBe(true);
    expect(canTransition('planned', 'failed')).toBe(true);
    expect(canTransition('planned', 'cancelled')).toBe(true);
    expect(canTransition('planned', 'in_progress')).toBe(true);
  });

  it('recusa concluir duas vezes', () => {
    // É a amarra que impede XP dobrado em duplo clique (defeito D2).
    expect(canTransition('completed', 'completed')).toBe(false);
  });

  it('permite reabrir, porque desfazer um clique errado é essencial', () => {
    expect(canTransition('completed', 'planned')).toBe(true);
    expect(canTransition('failed', 'planned')).toBe(true);
    expect(canTransition('cancelled', 'planned')).toBe(true);
  });

  it('recusa ir direto de concluída para falhada', () => {
    expect(canTransition('completed', 'failed')).toBe(false);
  });
});

describe('isOpen e isFinished', () => {
  it('trata planejada e em andamento como abertas', () => {
    expect(isOpen(makeTask({ status: 'planned' }))).toBe(true);
    expect(isOpen(makeTask({ status: 'in_progress' }))).toBe(true);
  });

  it('trata concluída, falhada e cancelada como encerradas', () => {
    expect(isFinished(makeTask({ status: 'completed' }))).toBe(true);
    expect(isFinished(makeTask({ status: 'failed' }))).toBe(true);
    expect(isFinished(makeTask({ status: 'cancelled' }))).toBe(true);
  });
});

describe('isOverdue', () => {
  it('é verdadeiro para tarefa aberta com horário no passado', () => {
    const task = makeTask({ scheduled_date: '2026-09-02', scheduled_time: '09:00' });
    expect(isOverdue(task, localTime(2026, 9, 2, 10, 0))).toBe(true);
  });

  it('é falso antes do horário', () => {
    const task = makeTask({ scheduled_date: '2026-09-02', scheduled_time: '18:00' });
    expect(isOverdue(task, localTime(2026, 9, 2, 10, 0))).toBe(false);
  });

  it('é falso para tarefa já encerrada', () => {
    const task = makeTask({
      status: 'completed',
      scheduled_date: '2026-09-01',
      scheduled_time: '09:00',
    });
    expect(isOverdue(task, localTime(2026, 9, 2))).toBe(false);
  });

  it('sem horário, só vence depois da meia-noite', () => {
    const task = makeTask({ scheduled_date: '2026-09-02', scheduled_time: null });
    expect(isOverdue(task, localTime(2026, 9, 2, 23, 0))).toBe(false);
    expect(isOverdue(task, localTime(2026, 9, 3, 0, 30))).toBe(true);
  });

  it('é falso para tarefa sem data', () => {
    expect(isOverdue(makeTask({ scheduled_date: null }), localTime(2026, 9, 2))).toBe(false);
  });
});

describe('evaluationBucket', () => {
  it('classifica encerrada como avaliada', () => {
    const task = makeTask({ status: 'failed' });
    expect(evaluationBucket(task, localTime(2026, 9, 2))).toBe('evaluated');
  });

  it('classifica vencida e sem resposta como NÃO avaliada, e não como falha', () => {
    const task = makeTask({ scheduled_date: '2026-09-01', scheduled_time: '09:00' });
    expect(evaluationBucket(task, localTime(2026, 9, 2))).toBe('unevaluated');
  });

  it('classifica tarefa futura como próxima', () => {
    const task = makeTask({ scheduled_date: '2026-09-05', scheduled_time: '09:00' });
    expect(evaluationBucket(task, localTime(2026, 9, 2))).toBe('upcoming');
  });
});

describe('compareBySchedule', () => {
  it('ordena pelo horário', () => {
    const early = makeTask({ scheduled_time: '08:00' });
    const late = makeTask({ scheduled_time: '18:00' });
    expect(compareBySchedule(early, late)).toBeLessThan(0);
  });

  it('joga tarefas sem horário para o fim do dia', () => {
    const timed = makeTask({ scheduled_time: '23:00' });
    const untimed = makeTask({ scheduled_time: null });
    expect(compareBySchedule(timed, untimed)).toBeLessThan(0);
  });
});

describe('tasksForDate', () => {
  it('filtra pela data e devolve em ordem cronológica', () => {
    const tasks = [
      makeTask({ scheduled_date: '2026-09-02', scheduled_time: '18:00', title: 'noite' }),
      makeTask({ scheduled_date: '2026-09-03', scheduled_time: '08:00', title: 'outro dia' }),
      makeTask({ scheduled_date: '2026-09-02', scheduled_time: '08:00', title: 'manhã' }),
    ];

    const result = tasksForDate(tasks, '2026-09-02');
    expect(result.map((t) => t.title)).toEqual(['manhã', 'noite']);
  });
});

describe('overdueFromPreviousDays', () => {
  it('traz apenas pendências abertas de dias anteriores', () => {
    const tasks = [
      makeTask({ scheduled_date: '2026-09-01', title: 'pendente de ontem' }),
      makeTask({ scheduled_date: '2026-09-01', status: 'completed', title: 'resolvida' }),
      makeTask({ scheduled_date: '2026-09-02', title: 'de hoje' }),
    ];

    const result = overdueFromPreviousDays(tasks, '2026-09-02', localTime(2026, 9, 2, 14, 0));
    expect(result.map((t) => t.title)).toEqual(['pendente de ontem']);
  });
});

describe('subtaskProgress', () => {
  const subtask = (is_done: boolean, position: number): Subtask => ({
    id: `s${position}`,
    task_id: 't1',
    title: `Sub ${position}`,
    is_done,
    position,
    created_at: '2026-09-01T10:00:00.000Z',
  });

  it('calcula o percentual do exemplo da seção 5', () => {
    const subtasks = [
      subtask(true, 1),
      subtask(true, 2),
      subtask(true, 3),
      subtask(true, 4),
      subtask(false, 5),
    ];
    expect(subtaskProgress(subtasks)).toEqual({ done: 4, total: 5, percent: 80 });
  });

  it('não divide por zero sem subtarefas', () => {
    expect(subtaskProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });
});

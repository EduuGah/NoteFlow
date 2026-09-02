/**
 * Testes de métricas.
 *
 * A afirmação que estes testes protegem: a taxa de conclusão não pode ser contaminada
 * nem por cancelamentos (decisão deliberada, seção 7) nem por tarefas que o usuário nunca
 * respondeu. É sobre essa taxa que todos os relatórios das seções 23–27 se apoiam.
 */

import { describe, expect, it } from 'vitest';
import {
  completionByHourBucket,
  completionByWeekday,
  completionStats,
  failReasonBreakdown,
  mostPostponed,
  plannedVsActual,
  totalPostponements,
  unevaluatedCount,
} from '../metrics';
import { localTime, makeTask } from './factories';

const NOW = localTime(2026, 9, 10, 12, 0);

describe('completionStats', () => {
  it('calcula a taxa apenas sobre concluídas e falhadas', () => {
    const tasks = [
      makeTask({ status: 'completed' }),
      makeTask({ status: 'completed' }),
      makeTask({ status: 'completed' }),
      makeTask({ status: 'failed' }),
    ];

    const stats = completionStats(tasks, NOW);
    expect(stats.rate).toBe(75);
    expect(stats.completed).toBe(3);
    expect(stats.failed).toBe(1);
  });

  it('não deixa o cancelamento derrubar a taxa (seção 7)', () => {
    // Cancelar é decidir que não precisava ser feito. Contar como fracasso puniria
    // o usuário justamente por ter revisado o próprio planejamento.
    const tasks = [
      makeTask({ status: 'completed' }),
      makeTask({ status: 'cancelled' }),
      makeTask({ status: 'cancelled' }),
    ];

    const stats = completionStats(tasks, NOW);
    expect(stats.rate).toBe(100);
    expect(stats.cancelled).toBe(2);
  });

  it('separa vencida sem resposta das falhas', () => {
    const tasks = [
      makeTask({ status: 'completed' }),
      makeTask({ status: 'planned', scheduled_date: '2026-09-01', scheduled_time: '09:00' }),
    ];

    const stats = completionStats(tasks, NOW);
    expect(stats.unevaluated).toBe(1);
    expect(stats.failed).toBe(0);
    // A taxa continua 100%: uma tarefa sem resposta não é fracasso, é ausência de dado.
    expect(stats.rate).toBe(100);
  });

  it('não conta tarefa futura como pendência vencida', () => {
    const tasks = [
      makeTask({ status: 'planned', scheduled_date: '2026-09-20', scheduled_time: '09:00' }),
    ];

    const stats = completionStats(tasks, NOW);
    expect(stats.upcoming).toBe(1);
    expect(stats.unevaluated).toBe(0);
  });

  it('devolve zero, e não NaN, sem nenhuma tarefa', () => {
    expect(completionStats([], NOW).rate).toBe(0);
  });
});

describe('failReasonBreakdown', () => {
  it('ordena por frequência e calcula o percentual da seção 25', () => {
    const tasks = [
      ...Array.from({ length: 6 }, () =>
        makeTask({ status: 'failed', fail_reason: 'tiredness' }),
      ),
      ...Array.from({ length: 3 }, () =>
        makeTask({ status: 'failed', fail_reason: 'lack_of_time' }),
      ),
      makeTask({ status: 'failed', fail_reason: 'forgot' }),
    ];

    const result = failReasonBreakdown(tasks);
    expect(result[0].reason).toBe('tiredness');
    expect(result[0].count).toBe(6);
    expect(result[0].share).toBe(60);
    expect(result).toHaveLength(3);
  });

  it('ignora falhas sem motivo registrado', () => {
    const tasks = [makeTask({ status: 'failed', fail_reason: null })];
    expect(failReasonBreakdown(tasks)).toEqual([]);
  });
});

describe('completionByWeekday', () => {
  it('agrupa por dia da semana com o tamanho da amostra', () => {
    const tasks = [
      // 2026-09-02 é quarta-feira.
      makeTask({ status: 'completed', scheduled_date: '2026-09-02' }),
      makeTask({ status: 'completed', scheduled_date: '2026-09-09' }),
      makeTask({ status: 'failed', scheduled_date: '2026-09-16' }),
    ];

    const wednesday = completionByWeekday(tasks).find((row) => row.key === 3);
    expect(wednesday?.sample).toBe(3);
    expect(wednesday?.rate).toBe(67);
  });

  it('ignora tarefas ainda abertas', () => {
    const tasks = [makeTask({ status: 'planned', scheduled_date: '2026-09-02' })];
    expect(completionByWeekday(tasks)).toEqual([]);
  });
});

describe('completionByHourBucket', () => {
  it('agrupa em faixas de duas horas', () => {
    const tasks = [
      makeTask({ status: 'completed', scheduled_time: '20:00' }),
      makeTask({ status: 'failed', scheduled_time: '21:30' }),
    ];

    const evening = completionByHourBucket(tasks).find((row) => row.label === '20h–22h');
    expect(evening?.sample).toBe(2);
    expect(evening?.rate).toBe(50);
  });

  it('ignora tarefas sem horário', () => {
    const tasks = [makeTask({ status: 'completed', scheduled_time: null })];
    expect(completionByHourBucket(tasks)).toEqual([]);
  });
});

describe('plannedVsActual', () => {
  it('compara estimativa e tempo real (seções 33 e 38)', () => {
    const tasks = [
      makeTask({ status: 'completed', duration_estimated: 60, duration_actual: 85 }),
      makeTask({ status: 'completed', duration_estimated: 30, duration_actual: null }),
    ];

    const result = plannedVsActual(tasks);
    expect(result.plannedMinutes).toBe(90);
    // Sem tempo real medido, cai para a estimativa: 85 + 30.
    expect(result.actualMinutes).toBe(115);
    expect(result.differenceMinutes).toBe(25);
    expect(result.measured).toBe(1);
  });
});

describe('adiamentos', () => {
  it('soma e ordena os mais adiados', () => {
    const tasks = [
      makeTask({ postpone_count: 3, title: 'estudar' }),
      makeTask({ postpone_count: 1, title: 'ler' }),
      makeTask({ postpone_count: 0, title: 'academia' }),
    ];

    expect(totalPostponements(tasks)).toBe(4);
    expect(mostPostponed(tasks).map((t) => t.title)).toEqual(['estudar', 'ler']);
  });
});

describe('unevaluatedCount', () => {
  it('conta somente as abertas que já venceram', () => {
    const tasks = [
      makeTask({ status: 'planned', scheduled_date: '2026-09-01', scheduled_time: '09:00' }),
      makeTask({ status: 'planned', scheduled_date: '2026-09-20', scheduled_time: '09:00' }),
      makeTask({ status: 'failed', scheduled_date: '2026-09-01' }),
    ];

    expect(unevaluatedCount(tasks, NOW)).toBe(1);
  });
});

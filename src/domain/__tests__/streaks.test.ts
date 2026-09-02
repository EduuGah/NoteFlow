/**
 * Testes de sequência.
 *
 * O defeito D3 era um contador que só crescia. Os dois casos que o expõem estão aqui:
 * check-ins espaçados não formam sequência longa, e uma lacuna quebra de verdade.
 *
 * O caso do "hoje ainda não marcado" é regra de produto, não detalhe técnico: se não ter
 * marcado às 9h da manhã já zerasse a sequência, o aplicativo passaria o dia inteiro
 * dizendo ao usuário que ele falhou em algo que ainda pode fazer (seção 47).
 */

import { describe, expect, it } from 'vitest';
import type { StreakOptions } from '../streaks';
import {
  calculateLongestStreak,
  calculateStreak,
  daysSinceLastCheckIn,
  isStreakAtRisk,
  streakCalendar,
} from '../streaks';

const DAILY = { frequency: 'daily' } as const;
const WEEKDAYS = { frequency: 'weekdays' } as const;

describe('calculateStreak — diário', () => {
  it('conta dias consecutivos terminando hoje', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
    expect(calculateStreak(dates, DAILY, '2026-09-03')).toBe(3);
  });

  it('não conta check-ins espaçados como sequência (defeito D3)', () => {
    // Uma vez por semana durante um mês exibia "5 dias" no código anterior.
    const dates = ['2026-08-05', '2026-08-12', '2026-08-19', '2026-08-26', '2026-09-02'];
    expect(calculateStreak(dates, DAILY, '2026-09-02')).toBe(1);
  });

  it('quebra a sequência quando há uma lacuna', () => {
    const dates = ['2026-09-01', '2026-09-03', '2026-09-04'];
    expect(calculateStreak(dates, DAILY, '2026-09-04')).toBe(2);
  });

  it('mantém a sequência viva quando hoje ainda não foi marcado', () => {
    // O dia não acabou. Marcar às 22h precisa continuar valendo.
    const dates = ['2026-09-01', '2026-09-02'];
    expect(calculateStreak(dates, DAILY, '2026-09-03')).toBe(2);
  });

  it('zera quando o último check-in é mais velho que ontem', () => {
    const dates = ['2026-09-01'];
    expect(calculateStreak(dates, DAILY, '2026-09-04')).toBe(0);
  });

  it('devolve zero sem nenhum check-in', () => {
    expect(calculateStreak([], DAILY, '2026-09-03')).toBe(0);
  });

  it('ignora datas duplicadas', () => {
    const dates = ['2026-09-02', '2026-09-02', '2026-09-03'];
    expect(calculateStreak(dates, DAILY, '2026-09-03')).toBe(2);
  });
});

describe('calculateStreak — dias úteis', () => {
  it('não quebra no fim de semana', () => {
    // Sexta 4, segunda 7. O sábado e o domingo não são dias esperados.
    const dates = ['2026-09-03', '2026-09-04', '2026-09-07'];
    expect(calculateStreak(dates, WEEKDAYS, '2026-09-07')).toBe(3);
  });

  it('no sábado, olha para a última sexta', () => {
    const dates = ['2026-09-03', '2026-09-04'];
    expect(calculateStreak(dates, WEEKDAYS, '2026-09-05')).toBe(2);
  });

  it('quebra quando um dia útil é pulado', () => {
    // Falta a quinta (dia 3).
    const dates = ['2026-09-02', '2026-09-04', '2026-09-07'];
    expect(calculateStreak(dates, WEEKDAYS, '2026-09-07')).toBe(2);
  });
});

describe('calculateStreak — semanal', () => {
  it('conta semanas consecutivas com ao menos um check-in', () => {
    const dates = ['2026-08-18', '2026-08-26', '2026-09-01'];
    expect(calculateStreak(dates, { frequency: 'weekly' }, '2026-09-02')).toBe(3);
  });

  it('não soma dois check-ins da mesma semana', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
    expect(calculateStreak(dates, { frequency: 'weekly' }, '2026-09-03')).toBe(1);
  });

  it('respeita os dias escolhidos quando eles existem', () => {
    // Segunda, quarta e sexta.
    const options: StreakOptions = { frequency: 'weekly', weekdays: [1, 3, 5] };
    const dates = ['2026-08-31', '2026-09-02', '2026-09-04'];
    expect(calculateStreak(dates, options, '2026-09-04')).toBe(3);
  });

  it('não quebra por um dia fora da frequência escolhida', () => {
    const options: StreakOptions = { frequency: 'weekly', weekdays: [1, 3, 5] };
    const dates = ['2026-09-02', '2026-09-04'];
    // Sábado não é dia esperado, então a sequência da sexta continua de pé.
    expect(calculateStreak(dates, options, '2026-09-05')).toBe(2);
  });
});

describe('calculateLongestStreak', () => {
  it('encontra a maior sequência do histórico, não a atual', () => {
    const dates = [
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', // 4 seguidos
      '2026-08-20', // isolado
    ];
    expect(calculateLongestStreak(dates, DAILY)).toBe(4);
  });

  it('devolve zero sem histórico', () => {
    expect(calculateLongestStreak([], DAILY)).toBe(0);
  });
});

describe('isStreakAtRisk', () => {
  it('avisa quando há sequência viva e hoje ainda não foi marcado', () => {
    expect(isStreakAtRisk(['2026-09-01', '2026-09-02'], DAILY, '2026-09-03')).toBe(true);
  });

  it('não avisa quando hoje já foi marcado', () => {
    expect(isStreakAtRisk(['2026-09-02', '2026-09-03'], DAILY, '2026-09-03')).toBe(false);
  });

  it('não avisa quando não há sequência a preservar', () => {
    // Sem sequência não existe risco — e nada a cobrar do usuário.
    expect(isStreakAtRisk([], DAILY, '2026-09-03')).toBe(false);
  });

  it('não avisa em dia fora da frequência', () => {
    expect(isStreakAtRisk(['2026-09-03', '2026-09-04'], WEEKDAYS, '2026-09-05')).toBe(false);
  });
});

describe('streakCalendar', () => {
  it('devolve a janela pedida terminando hoje', () => {
    const calendar = streakCalendar(['2026-09-02'], DAILY, '2026-09-03', 7);
    expect(calendar).toHaveLength(7);
    expect(calendar.at(-1)?.date).toBe('2026-09-03');
    expect(calendar.at(0)?.date).toBe('2026-08-28');
  });

  it('marca cumprido e esperado separadamente', () => {
    const calendar = streakCalendar(['2026-09-02'], WEEKDAYS, '2026-09-07', 7);
    const saturday = calendar.find((d) => d.date === '2026-09-05');
    const done = calendar.find((d) => d.date === '2026-09-02');

    expect(saturday?.expected).toBe(false);
    expect(saturday?.done).toBe(false);
    expect(done?.done).toBe(true);
  });
});

describe('daysSinceLastCheckIn', () => {
  it('conta a partir do check-in mais recente', () => {
    expect(daysSinceLastCheckIn(['2026-09-01', '2026-08-20'], '2026-09-04')).toBe(3);
  });

  it('devolve null quando nunca houve check-in', () => {
    expect(daysSinceLastCheckIn([], '2026-09-04')).toBeNull();
  });
});

/**
 * Testes de recorrência.
 *
 * Cobrem os exemplos literais da seção 12 (academia às segundas, quartas e sextas;
 * estudo todo dia; limpar o quarto todo sábado) e os casos de borda que quebram
 * calendário mal implementado: dia 31 em mês de 30, e fevereiro.
 */

import { describe, expect, it } from 'vitest';
import { describeRecurrence, expandRecurrence, nextOccurrence } from '../recurrence';
import type { RecurrenceRule } from '../../types/domain';

const rule = (overrides: Partial<RecurrenceRule>): RecurrenceRule => ({
  frequency: 'daily',
  startDate: '2026-09-01',
  ...overrides,
});

describe('expandRecurrence — diária', () => {
  it('devolve todos os dias do intervalo', () => {
    const result = expandRecurrence(rule({ frequency: 'daily' }), '2026-09-01', '2026-09-05');
    expect(result).toEqual([
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
    ]);
  });

  it('nunca começa antes da data de início da regra', () => {
    const result = expandRecurrence(
      rule({ frequency: 'daily', startDate: '2026-09-03' }),
      '2026-09-01',
      '2026-09-04',
    );
    expect(result).toEqual(['2026-09-03', '2026-09-04']);
  });

  it('respeita a data de término', () => {
    const result = expandRecurrence(
      rule({ frequency: 'daily', endDate: '2026-09-02' }),
      '2026-09-01',
      '2026-09-10',
    );
    expect(result).toEqual(['2026-09-01', '2026-09-02']);
  });

  it('devolve vazio quando o intervalo é anterior à regra', () => {
    const result = expandRecurrence(
      rule({ startDate: '2026-10-01' }),
      '2026-09-01',
      '2026-09-10',
    );
    expect(result).toEqual([]);
  });
});

describe('expandRecurrence — dias úteis', () => {
  it('pula sábado e domingo', () => {
    const result = expandRecurrence(
      rule({ frequency: 'weekdays' }),
      '2026-09-04',
      '2026-09-08',
    );
    // 5 e 6 de setembro de 2026 são sábado e domingo.
    expect(result).toEqual(['2026-09-04', '2026-09-07', '2026-09-08']);
  });
});

describe('expandRecurrence — semanal', () => {
  it('gera segunda, quarta e sexta (exemplo da academia, seção 12)', () => {
    const result = expandRecurrence(
      rule({ frequency: 'weekly', weekdays: [1, 3, 5] }),
      '2026-09-01',
      '2026-09-07',
    );
    expect(result).toEqual(['2026-09-02', '2026-09-04', '2026-09-07']);
  });

  it('sem dias definidos, usa o dia da semana da data de início', () => {
    // 2026-09-05 é um sábado — "limpar o quarto todo sábado".
    const result = expandRecurrence(
      rule({ frequency: 'weekly', startDate: '2026-09-05' }),
      '2026-09-01',
      '2026-09-30',
    );
    expect(result).toEqual(['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26']);
  });
});

describe('expandRecurrence — mensal', () => {
  it('cai no mesmo dia de cada mês', () => {
    const result = expandRecurrence(
      rule({ frequency: 'monthly', monthDay: 15 }),
      '2026-09-01',
      '2026-11-30',
    );
    expect(result).toEqual(['2026-09-15', '2026-10-15', '2026-11-15']);
  });

  it('em mês de 30 dias, o dia 31 vai para o último dia', () => {
    // Sem esse tratamento, a ocorrência de setembro simplesmente desapareceria.
    const result = expandRecurrence(
      rule({ frequency: 'monthly', monthDay: 31 }),
      '2026-09-01',
      '2026-10-31',
    );
    expect(result).toEqual(['2026-09-30', '2026-10-31']);
  });

  it('trata fevereiro corretamente', () => {
    const result = expandRecurrence(
      rule({ frequency: 'monthly', monthDay: 30, startDate: '2026-02-01' }),
      '2026-02-01',
      '2026-02-28',
    );
    expect(result).toEqual(['2026-02-28']);
  });
});

describe('expandRecurrence — intervalo personalizado', () => {
  it('conta a partir da data de início', () => {
    const result = expandRecurrence(
      rule({ frequency: 'custom', intervalDays: 3 }),
      '2026-09-01',
      '2026-09-10',
    );
    expect(result).toEqual(['2026-09-01', '2026-09-04', '2026-09-07', '2026-09-10']);
  });
});

describe('expandRecurrence — proteção', () => {
  it('recusa intervalos absurdos em vez de travar a interface', () => {
    expect(() =>
      expandRecurrence(rule({ frequency: 'daily' }), '2026-01-01', '2030-01-01'),
    ).toThrow(RangeError);
  });
});

describe('nextOccurrence', () => {
  it('encontra a próxima data a partir de hoje, inclusive', () => {
    expect(nextOccurrence(rule({ frequency: 'weekly', weekdays: [1] }), '2026-09-02')).toBe(
      '2026-09-07',
    );
  });

  it('devolve a própria data quando ela já é uma ocorrência', () => {
    expect(nextOccurrence(rule({ frequency: 'daily' }), '2026-09-02')).toBe('2026-09-02');
  });

  it('devolve null quando a regra já terminou', () => {
    expect(
      nextOccurrence(rule({ frequency: 'daily', endDate: '2026-09-01' }), '2026-09-02'),
    ).toBeNull();
  });
});

describe('describeRecurrence', () => {
  it('descreve as regras em português', () => {
    expect(describeRecurrence(rule({ frequency: 'daily' }))).toBe('Todos os dias');
    expect(describeRecurrence(rule({ frequency: 'weekdays' }))).toBe('De segunda a sexta');
    expect(describeRecurrence(rule({ frequency: 'weekly', weekdays: [1, 3, 5] }))).toBe(
      'Toda segunda, quarta e sexta',
    );
    expect(describeRecurrence(rule({ frequency: 'monthly', monthDay: 10 }))).toBe(
      'Todo dia 10 do mês',
    );
    expect(describeRecurrence(rule({ frequency: 'custom', intervalDays: 3 }))).toBe(
      'A cada 3 dias',
    );
  });
});

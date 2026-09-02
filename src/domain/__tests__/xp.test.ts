import { describe, expect, it } from 'vitest';
import {
  MAX_XP_PER_ACTIVITY,
  calculateHabitXp,
  calculateTaskXp,
  durationFactor,
  xpIdempotencyKey,
} from '../xp';

describe('calculateTaskXp', () => {
  it('devolve os valores da seção 13 no caso central', () => {
    const base = { priority: 'medium', durationMinutes: 30 } as const;
    expect(calculateTaskXp({ ...base, difficulty: 'easy' })).toBe(10);
    expect(calculateTaskXp({ ...base, difficulty: 'medium' })).toBe(25);
    expect(calculateTaskXp({ ...base, difficulty: 'hard' })).toBe(50);
  });

  it('faz a prioridade importar, sem dominar a dificuldade', () => {
    const low = calculateTaskXp({ difficulty: 'medium', priority: 'low' });
    const critical = calculateTaskXp({ difficulty: 'medium', priority: 'critical' });
    const hardLow = calculateTaskXp({ difficulty: 'hard', priority: 'low' });

    expect(critical).toBeGreaterThan(low);
    // Uma tarefa difícil de prioridade baixa ainda vale mais que uma média crítica:
    // dificuldade é a variável principal, prioridade é ajuste.
    expect(hardLow).toBeGreaterThan(critical);
  });

  it('não penaliza quem não informa a duração', () => {
    const semDuracao = calculateTaskXp({ difficulty: 'medium', priority: 'medium' });
    const curta = calculateTaskXp({
      difficulty: 'medium',
      priority: 'medium',
      durationMinutes: 15,
    });
    expect(semDuracao).toBe(25);
    expect(curta).toBe(25);
  });

  it('respeita o teto mesmo no pior caso combinado', () => {
    const maximo = calculateTaskXp({
      difficulty: 'hard',
      priority: 'critical',
      durationMinutes: 100_000,
    });
    expect(maximo).toBeLessThanOrEqual(MAX_XP_PER_ACTIVITY);
  });

  it('nunca devolve XP menor que o piso', () => {
    const minimo = calculateTaskXp({ difficulty: 'easy', priority: 'low' });
    expect(minimo).toBeGreaterThanOrEqual(5);
  });
});

describe('durationFactor', () => {
  it('é neutro até 30 minutos', () => {
    expect(durationFactor(null)).toBe(1);
    expect(durationFactor(0)).toBe(1);
    expect(durationFactor(30)).toBe(1);
  });

  it('cresce até o teto de 1,5x e para', () => {
    expect(durationFactor(90)).toBeCloseTo(1.25);
    expect(durationFactor(150)).toBeCloseTo(1.5);
    expect(durationFactor(600)).toBeCloseTo(1.5);
  });
});

describe('calculateHabitXp', () => {
  it('devolve 20 XP no caso médio, como cita a seção 13', () => {
    expect(calculateHabitXp('medium')).toBe(20);
  });

  it('vale menos que a tarefa equivalente: o valor do hábito está na repetição', () => {
    expect(calculateHabitXp('hard')).toBeLessThan(
      calculateTaskXp({ difficulty: 'hard', priority: 'medium' }),
    );
  });
});

describe('xpIdempotencyKey', () => {
  it('gera a mesma chave para a mesma origem, impedindo crédito duplo', () => {
    expect(xpIdempotencyKey('task', 'abc')).toBe(xpIdempotencyKey('task', 'abc'));
  });

  it('separa ocorrências distintas de uma mesma tarefa recorrente', () => {
    expect(xpIdempotencyKey('task', 'abc', '2026-09-01')).not.toBe(
      xpIdempotencyKey('task', 'abc', '2026-09-02'),
    );
  });

  it('separa origens de tipos diferentes com o mesmo id', () => {
    expect(xpIdempotencyKey('task', 'abc')).not.toBe(xpIdempotencyKey('habit', 'abc'));
  });
});

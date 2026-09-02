import { describe, expect, it } from 'vitest';
import {
  MAX_LEVEL,
  levelFromXp,
  levelProgress,
  levelsGained,
  xpRequiredForLevel,
} from '../levels';

describe('xpRequiredForLevel', () => {
  it('reproduz exatamente a curva da especificação (seção 15)', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(250);
    expect(xpRequiredForLevel(4)).toBe(450);
    expect(xpRequiredForLevel(5)).toBe(700);
  });

  it('mantém incrementos crescentes, sem degrau abrupto', () => {
    const deltas = Array.from({ length: 20 }, (_, i) =>
      xpRequiredForLevel(i + 2) - xpRequiredForLevel(i + 1),
    );
    for (let i = 1; i < deltas.length; i += 1) {
      expect(deltas[i]).toBeGreaterThan(deltas[i - 1]);
      // Um salto que mais que dobra faria a progressão travar de repente.
      expect(deltas[i]).toBeLessThan(deltas[i - 1] * 2);
    }
  });

  it('limita ao nível máximo em vez de extrapolar', () => {
    expect(xpRequiredForLevel(MAX_LEVEL + 50)).toBe(xpRequiredForLevel(MAX_LEVEL));
  });
});

describe('levelFromXp', () => {
  it('trata XP zero, negativo e inválido como nível 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
  });

  it('sobe de nível exatamente no limiar, não um XP depois', () => {
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(249)).toBe(2);
    expect(levelFromXp(250)).toBe(3);
    expect(levelFromXp(700)).toBe(5);
  });

  it('é o inverso exato de xpRequiredForLevel em todos os limiares', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      const threshold = xpRequiredForLevel(level);
      expect(levelFromXp(threshold)).toBe(level);
      if (level > 1) expect(levelFromXp(threshold - 1)).toBe(level - 1);
    }
  });
});

describe('levelProgress', () => {
  it('reporta progresso zerado logo após subir de nível', () => {
    const progress = levelProgress(250);
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(0);
    expect(progress.xpForLevel).toBe(200);
    expect(progress.xpToNextLevel).toBe(200);
    expect(progress.percent).toBe(0);
  });

  it('reporta progresso parcial dentro do nível', () => {
    const progress = levelProgress(350);
    expect(progress.level).toBe(3);
    expect(progress.xpIntoLevel).toBe(100);
    expect(progress.xpToNextLevel).toBe(100);
    expect(progress.percent).toBe(50);
  });

  it('não divide por zero nem passa de 100% no nível máximo', () => {
    const progress = levelProgress(xpRequiredForLevel(MAX_LEVEL) + 10_000);
    expect(progress.isMaxLevel).toBe(true);
    expect(progress.percent).toBe(100);
    expect(progress.xpToNextLevel).toBe(0);
  });
});

describe('levelsGained', () => {
  it('não relata subida quando o nível não mudou', () => {
    expect(levelsGained(10, 50)).toBe(0);
  });

  it('conta múltiplos níveis atravessados de uma vez', () => {
    expect(levelsGained(0, 250)).toBe(2);
  });

  it('nunca devolve valor negativo se o XP for corrigido para baixo', () => {
    expect(levelsGained(700, 0)).toBe(0);
  });
});

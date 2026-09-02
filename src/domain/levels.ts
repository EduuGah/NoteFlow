/**
 * Curva de progressão de nível.
 *
 * A seção 15 da especificação pede os limiares 0, 100, 250, 450, 700 — incrementos de
 * 100, 150, 200, 250. Isso é uma progressão aritmética de segunda ordem, o que dá a
 * fórmula fechada:
 *
 *     xpAcumuladoParaNivel(n) = 25 · (n − 1) · (n + 2)
 *
 * n=1 → 0, n=2 → 100, n=3 → 250, n=4 → 450, n=5 → 700, n=6 → 1000, n=7 → 1350…
 *
 * Ter forma fechada (em vez de uma tabela) importa por dois motivos: a curva continua
 * suave indefinidamente sem precisar de manutenção, e o nível pode ser derivado de
 * `xp_total` por inversão, sem laço e sem estado armazenado.
 *
 * Nada aqui é persistido. `xp_total` é a única fonte de verdade.
 */

export const MAX_LEVEL = 100;

/** XP acumulado necessário para alcançar o nível informado. */
export function xpRequiredForLevel(level: number): number {
  const clamped = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 25 * (clamped - 1) * (clamped + 2);
}

/**
 * Nível correspondente a um XP acumulado.
 *
 * Invertendo 25(n−1)(n+2) ≤ xp chega-se a n = ⌊(−1 + √(9 + 4·xp/25)) / 2⌋. O ajuste
 * final protege contra o caso em que o ponto flutuante devolve 1,9999999 exatamente
 * sobre um limiar — um usuário com 100 XP tem que ver nível 2, não nível 1.
 */
export function levelFromXp(xpTotal: number): number {
  if (!Number.isFinite(xpTotal) || xpTotal <= 0) return 1;

  const approx = Math.floor((-1 + Math.sqrt(9 + (4 * xpTotal) / 25)) / 2);
  let level = Math.max(1, Math.min(MAX_LEVEL, approx));

  while (level < MAX_LEVEL && xpTotal >= xpRequiredForLevel(level + 1)) level += 1;
  while (level > 1 && xpTotal < xpRequiredForLevel(level)) level -= 1;

  return level;
}

export interface LevelProgress {
  level: number;
  /** XP acumulado total. */
  xpTotal: number;
  /** XP conquistado dentro do nível atual. */
  xpIntoLevel: number;
  /** XP necessário para atravessar o nível atual inteiro. */
  xpForLevel: number;
  /** XP que ainda falta para o próximo nível. Zero no nível máximo. */
  xpToNextLevel: number;
  /** 0–100, para barras de progresso. 100 no nível máximo. */
  percent: number;
  isMaxLevel: boolean;
}

export function levelProgress(xpTotal: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xpTotal || 0));
  const level = levelFromXp(safeXp);
  const isMaxLevel = level >= MAX_LEVEL;

  const floor = xpRequiredForLevel(level);
  const ceiling = isMaxLevel ? floor : xpRequiredForLevel(level + 1);

  const xpIntoLevel = safeXp - floor;
  const xpForLevel = ceiling - floor;

  return {
    level,
    xpTotal: safeXp,
    xpIntoLevel,
    xpForLevel,
    xpToNextLevel: isMaxLevel ? 0 : xpForLevel - xpIntoLevel,
    percent: isMaxLevel ? 100 : Math.round((xpIntoLevel / xpForLevel) * 100),
    isMaxLevel,
  };
}

/**
 * Quantos níveis foram atravessados ao ganhar XP. Zero quando não houve subida.
 * Devolve o valor em vez de disparar efeito, para que o serviço decida o feedback.
 */
export function levelsGained(xpBefore: number, xpAfter: number): number {
  return Math.max(0, levelFromXp(xpAfter) - levelFromXp(xpBefore));
}

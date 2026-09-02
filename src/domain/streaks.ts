/**
 * Sequências (streaks).
 *
 * O streak é DERIVADO dos check-ins, nunca um contador incrementado a cada conclusão.
 * O código anterior fazia `current_streak + 1` sem olhar datas, o que exibia "52 dias"
 * para quem marcou um hábito uma vez por semana durante um ano. Métrica mentirosa
 * contamina todos os insights que dependem dela.
 *
 * Duas decisões de produto, ambas vindas da seção 47 (gamificação não punitiva):
 *
 * 1. Não ter marcado HOJE ainda não quebra o streak. O dia não acabou. A sequência só
 *    quebra quando o último check-in fica mais velho que o dia esperado anterior.
 * 2. Fim de semana não quebra streak de hábito com frequência `weekdays`, e dias fora
 *    dos dias escolhidos não quebram streak `weekly`.
 */

import { addDaysIso, daysBetween, isWeekend, startOfWeekIso, weekdayOf } from '../lib/date';
import type { HabitFrequency, IsoDate, Weekday } from '../types/domain';

export interface StreakOptions {
  frequency: HabitFrequency;
  /** Dias esperados quando a frequência é `weekly`. Vazio significa "qualquer dia da semana". */
  weekdays?: Weekday[];
}

/** Um dia conta para a sequência? Dias que não contam são pulados sem quebrar nada. */
function isExpectedDay(date: IsoDate, options: StreakOptions): boolean {
  switch (options.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return !isWeekend(date);
    case 'weekly':
      return options.weekdays?.length ? options.weekdays.includes(weekdayOf(date)) : true;
  }
}

/** Dia esperado anterior a `date`, caminhando para trás. `null` se nenhum for encontrado. */
function previousExpectedDay(date: IsoDate, options: StreakOptions): IsoDate | null {
  for (let i = 1; i <= 14; i += 1) {
    const candidate = addDaysIso(date, -i);
    if (isExpectedDay(candidate, options)) return candidate;
  }
  return null;
}

/**
 * Sequência atual, em dias de check-in (não em dias corridos).
 *
 * Para `weekly`, a unidade é a semana: cada semana com ao menos um check-in conta 1.
 */
export function calculateStreak(
  dates: IsoDate[],
  options: StreakOptions,
  todayDate: IsoDate,
): number {
  if (dates.length === 0) return 0;

  if (options.frequency === 'weekly' && !options.weekdays?.length) {
    return calculateWeeklyStreak(dates, todayDate);
  }

  const done = new Set(dates);

  // Ponto de partida: hoje, se hoje é dia esperado; senão o dia esperado anterior.
  // Se hoje é esperado e ainda não foi marcado, começamos do anterior — o dia não acabou.
  let cursor: IsoDate | null = isExpectedDay(todayDate, options)
    ? todayDate
    : previousExpectedDay(todayDate, options);

  if (cursor && !done.has(cursor)) {
    cursor = previousExpectedDay(cursor, options);
  }

  let streak = 0;
  while (cursor && done.has(cursor)) {
    streak += 1;
    cursor = previousExpectedDay(cursor, options);
  }

  return streak;
}

/** Semanas consecutivas com ao menos um check-in, terminando nesta ou na semana passada. */
function calculateWeeklyStreak(dates: IsoDate[], todayDate: IsoDate): number {
  const weeks = new Set(dates.map(startOfWeekIso));

  let cursor = startOfWeekIso(todayDate);
  if (!weeks.has(cursor)) cursor = addDaysIso(cursor, -7);

  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDaysIso(cursor, -7);
  }

  return streak;
}

/** Maior sequência já alcançada. Usada no perfil (seção 19). */
export function calculateLongestStreak(
  dates: IsoDate[],
  options: StreakOptions,
): number {
  if (dates.length === 0) return 0;

  const sorted = [...new Set(dates)].sort();
  let longest = 0;

  for (const date of sorted) {
    const streak = calculateStreak(sorted, options, date);
    if (streak > longest) longest = streak;
  }

  return longest;
}

/**
 * Últimos `days` dias com o estado de cada um. Alimenta a trilha de pontinhos do
 * cartão de hábito, que mostra consistência sem precisar de gráfico.
 */
export interface StreakDay {
  date: IsoDate;
  done: boolean;
  expected: boolean;
}

export function streakCalendar(
  dates: IsoDate[],
  options: StreakOptions,
  todayDate: IsoDate,
  days = 14,
): StreakDay[] {
  const done = new Set(dates);
  const result: StreakDay[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDaysIso(todayDate, -i);
    result.push({
      date,
      done: done.has(date),
      expected: isExpectedDay(date, options),
    });
  }

  return result;
}

/**
 * Um streak está em risco quando hoje é dia esperado, ainda não foi marcado, e já existe
 * uma sequência a preservar. A interface usa isso para um lembrete discreto — nunca para
 * uma mensagem de culpa.
 */
export function isStreakAtRisk(
  dates: IsoDate[],
  options: StreakOptions,
  todayDate: IsoDate,
): boolean {
  if (!isExpectedDay(todayDate, options)) return false;
  if (dates.includes(todayDate)) return false;
  return calculateStreak(dates, options, todayDate) > 0;
}

/** Dias desde o último check-in. `null` quando nunca houve um. */
export function daysSinceLastCheckIn(
  dates: IsoDate[],
  todayDate: IsoDate,
): number | null {
  if (dates.length === 0) return null;
  const last = [...dates].sort().at(-1) as IsoDate;
  return daysBetween(last, todayDate);
}

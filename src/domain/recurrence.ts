/**
 * Expansão de regras de recorrência.
 *
 * As ocorrências são calculadas sob demanda para o intervalo visível, e não gravadas no
 * banco. Uma tarefa diária por três anos seriam ~1.100 linhas por regra, quase todas
 * nunca tocadas — e editar a regra exigiria reescrever todo o futuro. Só vira linha real
 * em `tasks` a ocorrência com que o usuário interage. Ver docs/00, ambiguidade A4.
 */

import { addDaysIso, daysBetween, fromIsoDate, isWeekend, weekdayOf } from '../lib/date';
import type { IsoDate, RecurrenceRule } from '../types/domain';

/** Guarda contra intervalos absurdos vindos de um seletor de data mal preenchido. */
const MAX_OCCURRENCES = 400;

function matchesRule(date: IsoDate, rule: RecurrenceRule): boolean {
  switch (rule.frequency) {
    case 'daily':
      return true;

    case 'weekdays':
      return !isWeekend(date);

    case 'weekly':
      return rule.weekdays?.length
        ? rule.weekdays.includes(weekdayOf(date))
        : weekdayOf(date) === weekdayOf(rule.startDate);

    case 'monthly': {
      const day = fromIsoDate(date).getDate();
      const target = rule.monthDay ?? fromIsoDate(rule.startDate).getDate();
      if (day === target) return true;
      // Dia 31 em mês de 30: cai no último dia do mês, em vez de simplesmente sumir.
      const lastDayOfMonth = new Date(
        fromIsoDate(date).getFullYear(),
        fromIsoDate(date).getMonth() + 1,
        0,
      ).getDate();
      return target > lastDayOfMonth && day === lastDayOfMonth;
    }

    case 'custom': {
      const interval = Math.max(1, rule.intervalDays ?? 1);
      const offset = daysBetween(rule.startDate, date);
      return offset >= 0 && offset % interval === 0;
    }
  }
}

/**
 * Datas em que a regra ocorre dentro de `[rangeStart, rangeEnd]`, inclusive.
 * O intervalo é sempre limitado pela janela visível na interface, então a varredura
 * dia a dia é barata e muito mais legível que aritmética por frequência.
 */
export function expandRecurrence(
  rule: RecurrenceRule,
  rangeStart: IsoDate,
  rangeEnd: IsoDate,
): IsoDate[] {
  const start = rangeStart < rule.startDate ? rule.startDate : rangeStart;
  const end = rule.endDate && rule.endDate < rangeEnd ? rule.endDate : rangeEnd;

  if (start > end) return [];

  const span = daysBetween(start, end);
  if (span < 0 || span > MAX_OCCURRENCES) {
    throw new RangeError(
      `Intervalo de recorrência excede ${MAX_OCCURRENCES} dias (recebido: ${span}).`,
    );
  }

  const occurrences: IsoDate[] = [];
  for (let i = 0; i <= span; i += 1) {
    const date = addDaysIso(start, i);
    if (matchesRule(date, rule)) occurrences.push(date);
  }

  return occurrences;
}

/** Próxima ocorrência a partir de `from`, inclusive. `null` se a regra já terminou. */
export function nextOccurrence(
  rule: RecurrenceRule,
  from: IsoDate,
  lookaheadDays = 90,
): IsoDate | null {
  const start = from < rule.startDate ? rule.startDate : from;

  for (let i = 0; i <= lookaheadDays; i += 1) {
    const date = addDaysIso(start, i);
    if (rule.endDate && date > rule.endDate) return null;
    if (matchesRule(date, rule)) return date;
  }

  return null;
}

/** Descrição legível da regra, para a lista de tarefas e o formulário. */
export function describeRecurrence(rule: RecurrenceRule): string {
  const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  switch (rule.frequency) {
    case 'daily':
      return 'Todos os dias';
    case 'weekdays':
      return 'De segunda a sexta';
    case 'weekly': {
      const days = rule.weekdays?.length
        ? rule.weekdays
        : [weekdayOf(rule.startDate)];
      const names = [...days].sort().map((d) => WEEKDAY_NAMES[d]);
      if (names.length === 1) return `Toda ${names[0]}`;
      return `Toda ${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
    }
    case 'monthly': {
      const day = rule.monthDay ?? fromIsoDate(rule.startDate).getDate();
      return `Todo dia ${day} do mês`;
    }
    case 'custom': {
      const interval = Math.max(1, rule.intervalDays ?? 1);
      return interval === 1 ? 'Todos os dias' : `A cada ${interval} dias`;
    }
  }
}

/**
 * Datas locais.
 *
 * Regra do projeto: `toISOString()` NUNCA é usado para produzir uma data de calendário.
 * Ele converte para UTC, e num fuso como UTC−3 isso empurra tudo que acontece depois das
 * 21h para o dia seguinte — justamente as atividades noturnas que os relatórios precisam
 * analisar. Este módulo é o único lugar autorizado a converter entre `Date` e `IsoDate`.
 */

import {
  addDays,
  differenceInCalendarDays,
  format,
  isValid,
  parse,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClockTime, IsoDate, Weekday } from '../types/domain';

const DATE_FORMAT = 'yyyy-MM-dd';

/** Converte um `Date` para data de calendário no fuso local. */
export function toIsoDate(date: Date): IsoDate {
  return format(date, DATE_FORMAT);
}

/** Interpreta `yyyy-MM-dd` como meia-noite local (e não como UTC, que é o padrão do `new Date`). */
export function fromIsoDate(value: IsoDate): Date {
  return parse(value, DATE_FORMAT, new Date());
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(fromIsoDate(value));
}

/** Data de hoje no fuso local. `now` é injetável para tornar os testes determinísticos. */
export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

export function addDaysIso(value: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(fromIsoDate(value), days));
}

/** Diferença em dias de calendário: `b - a`. Positivo quando `b` é posterior. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return differenceInCalendarDays(fromIsoDate(b), fromIsoDate(a));
}

export function weekdayOf(value: IsoDate): Weekday {
  return fromIsoDate(value).getDay() as Weekday;
}

/** Segunda-feira da semana da data informada. */
export function startOfWeekIso(value: IsoDate): IsoDate {
  return toIsoDate(startOfWeek(fromIsoDate(value), { weekStartsOn: 1 }));
}

export function isWeekend(value: IsoDate): boolean {
  const day = weekdayOf(value);
  return day === 0 || day === 6;
}

/**
 * Combina data de calendário e horário de parede num instante local.
 * Sem horário, assume o fim do dia — uma tarefa sem hora só fica vencida à meia-noite.
 */
export function toLocalDateTime(date: IsoDate, time: ClockTime | null): Date {
  const base = fromIsoDate(date);
  const [hours, minutes] = (time ?? '23:59').split(':').map(Number);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

/** `HH:mm` a partir de um `Date` local. */
export function toClockTime(date: Date): ClockTime {
  return format(date, 'HH:mm');
}

/** Minutos desde a meia-noite. Usado para agrupar por faixa horária nos insights. */
export function minutesOfDay(time: ClockTime): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// --- Formatação para a interface ------------------------------------------

export function formatLongDate(value: IsoDate): string {
  return format(fromIsoDate(value), "EEEE, d 'de' MMMM", { locale: ptBR });
}

export function formatShortDate(value: IsoDate): string {
  return format(fromIsoDate(value), "d 'de' MMM", { locale: ptBR });
}

export function formatWeekdayShort(value: IsoDate): string {
  return format(fromIsoDate(value), 'EEEEEE', { locale: ptBR });
}

/** "Hoje" / "Amanhã" / "Ontem" quando aplicável; caso contrário, a data curta. */
export function formatRelativeDay(value: IsoDate, now: Date = new Date()): string {
  const diff = daysBetween(today(now), value);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return formatShortDate(value);
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

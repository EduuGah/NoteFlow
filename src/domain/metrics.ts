/**
 * Métricas e detecção de padrões (seções 23–28).
 *
 * A regra que sustenta todo este arquivo: a taxa de conclusão é calculada apenas sobre
 * tarefas AVALIADAS (concluídas, falhadas ou canceladas). Tarefas vencidas que o usuário
 * nunca respondeu entram num terceiro conjunto, exibido separadamente. Misturá-las com
 * as falhas transformaria "esqueci de abrir o aplicativo" em "falhei", e a análise inteira
 * passaria a medir uso do aplicativo em vez de execução da rotina.
 *
 * Todo agregado carrega o tamanho da amostra. Um insight sobre 3 tarefas não é insight;
 * a camada de apresentação usa `sample` para decidir se mostra ou se cala.
 */

import { minutesOfDay, weekdayOf } from '../lib/date';
import type { Category, FailReason, IsoDate, Task, Weekday } from '../types/domain';
import { evaluationBucket, isOpen } from './tasks';

/** Amostra mínima para que um agregado seja apresentado como padrão. */
export const MIN_SAMPLE_FOR_INSIGHT = 5;

export interface CompletionStats {
  /** Concluídas, falhadas ou canceladas. Denominador da taxa. */
  evaluated: number;
  completed: number;
  failed: number;
  cancelled: number;
  /** Vencidas e nunca respondidas. Fora da taxa, exibidas à parte. */
  unevaluated: number;
  /** Ainda dentro do prazo. */
  upcoming: number;
  total: number;
  /** 0–100 sobre as avaliadas. Zero quando não há avaliadas. */
  rate: number;
}

export function completionStats(tasks: Task[], now: Date = new Date()): CompletionStats {
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let unevaluated = 0;
  let upcoming = 0;

  for (const task of tasks) {
    const bucket = evaluationBucket(task, now);
    if (bucket === 'unevaluated') {
      unevaluated += 1;
      continue;
    }
    if (bucket === 'upcoming') {
      upcoming += 1;
      continue;
    }
    if (task.status === 'completed') completed += 1;
    else if (task.status === 'failed') failed += 1;
    else if (task.status === 'cancelled') cancelled += 1;
  }

  // Cancelada significa "não precisava mais ser feita" (seção 7). Não é fracasso, então
  // não entra no denominador — mas é contada, porque cancelar muito também é um padrão.
  const evaluated = completed + failed + cancelled;
  const denominator = completed + failed;

  return {
    evaluated,
    completed,
    failed,
    cancelled,
    unevaluated,
    upcoming,
    total: tasks.length,
    rate: denominator === 0 ? 0 : Math.round((completed / denominator) * 100),
  };
}

export interface Breakdown<K extends string | number> {
  key: K;
  label: string;
  completed: number;
  failed: number;
  /** Concluídas + falhadas. Tamanho da amostra deste recorte. */
  sample: number;
  rate: number;
}

function buildBreakdown<K extends string | number>(
  buckets: Map<K, { completed: number; failed: number }>,
  label: (key: K) => string,
): Breakdown<K>[] {
  return [...buckets.entries()].map(([key, value]) => {
    const sample = value.completed + value.failed;
    return {
      key,
      label: label(key),
      completed: value.completed,
      failed: value.failed,
      sample,
      rate: sample === 0 ? 0 : Math.round((value.completed / sample) * 100),
    };
  });
}

function tally<K extends string | number>(
  tasks: Task[],
  keyOf: (task: Task) => K | null,
): Map<K, { completed: number; failed: number }> {
  const buckets = new Map<K, { completed: number; failed: number }>();

  for (const task of tasks) {
    if (task.status !== 'completed' && task.status !== 'failed') continue;
    const key = keyOf(task);
    if (key === null) continue;

    const bucket = buckets.get(key) ?? { completed: 0, failed: 0 };
    if (task.status === 'completed') bucket.completed += 1;
    else bucket.failed += 1;
    buckets.set(key, bucket);
  }

  return buckets;
}

const WEEKDAY_FULL: Record<Weekday, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

/** "Quarta-feira foi seu dia mais consistente" (seção 23). */
export function completionByWeekday(tasks: Task[]): Breakdown<Weekday>[] {
  const buckets = tally<Weekday>(tasks, (t) =>
    t.scheduled_date ? weekdayOf(t.scheduled_date) : null,
  );
  return buildBreakdown(buckets, (k) => WEEKDAY_FULL[k]).sort(
    (a, b) => Number(a.key) - Number(b.key),
  );
}

/**
 * Faixas de 2 horas. Faixas de 1 hora fragmentam demais a amostra e produzem
 * "100% de conclusão às 15h" em cima de uma única tarefa.
 */
export const HOUR_BUCKET_SIZE = 2;

export function completionByHourBucket(tasks: Task[]): Breakdown<number>[] {
  const buckets = tally<number>(tasks, (t) => {
    if (!t.scheduled_time) return null;
    return Math.floor(minutesOfDay(t.scheduled_time) / 60 / HOUR_BUCKET_SIZE);
  });

  return buildBreakdown(buckets, (k) => {
    const start = k * HOUR_BUCKET_SIZE;
    return `${String(start).padStart(2, '0')}h–${String(start + HOUR_BUCKET_SIZE).padStart(2, '0')}h`;
  }).sort((a, b) => Number(a.key) - Number(b.key));
}

export function completionByCategory(
  tasks: Task[],
  categories: Category[],
): Breakdown<string>[] {
  const names = new Map(categories.map((c) => [c.id, c.name]));
  const buckets = tally<string>(tasks, (t) => t.category_id ?? '__none__');

  return buildBreakdown(buckets, (k) =>
    k === '__none__' ? 'Sem categoria' : (names.get(k) ?? 'Categoria removida'),
  ).sort((a, b) => b.sample - a.sample);
}

export interface FailReasonCount {
  reason: FailReason;
  count: number;
  /** Percentual sobre o total de falhas com motivo registrado. */
  share: number;
}

/** "Cansaço representa 34% das suas tarefas não realizadas" (seção 25). */
export function failReasonBreakdown(tasks: Task[]): FailReasonCount[] {
  const counts = new Map<FailReason, number>();

  for (const task of tasks) {
    if (task.status !== 'failed' || !task.fail_reason) continue;
    counts.set(task.fail_reason, (counts.get(task.fail_reason) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
      share: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export interface DailyPoint {
  date: IsoDate;
  planned: number;
  completed: number;
  failed: number;
  unevaluated: number;
  rate: number;
}

/** Série diária para o gráfico de conclusão ao longo do tempo. */
export function dailySeries(
  tasks: Task[],
  dates: IsoDate[],
  now: Date = new Date(),
): DailyPoint[] {
  const byDate = new Map<IsoDate, Task[]>();
  for (const task of tasks) {
    if (!task.scheduled_date) continue;
    const list = byDate.get(task.scheduled_date) ?? [];
    list.push(task);
    byDate.set(task.scheduled_date, list);
  }

  return dates.map((date) => {
    const stats = completionStats(byDate.get(date) ?? [], now);
    return {
      date,
      planned: stats.total,
      completed: stats.completed,
      failed: stats.failed,
      unevaluated: stats.unevaluated,
      rate: stats.rate,
    };
  });
}

/**
 * Planejado versus realizado, em minutos (seção 33).
 * `realizado` usa a duração real quando informada, e cai para a estimativa quando não.
 */
export interface PlannedVsActual {
  plannedMinutes: number;
  actualMinutes: number;
  differenceMinutes: number;
  /** Quantas tarefas concluídas tinham duração real registrada. */
  measured: number;
}

export function plannedVsActual(tasks: Task[]): PlannedVsActual {
  let planned = 0;
  let actual = 0;
  let measured = 0;

  for (const task of tasks) {
    planned += task.duration_estimated ?? 0;
    if (task.status !== 'completed') continue;
    if (task.duration_actual !== null) {
      actual += task.duration_actual;
      measured += 1;
    } else {
      actual += task.duration_estimated ?? 0;
    }
  }

  return {
    plannedMinutes: planned,
    actualMinutes: actual,
    differenceMinutes: actual - planned,
    measured,
  };
}

/** Tarefas mais adiadas. Base do insight de procrastinação (seção 24). */
export function mostPostponed(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((t) => t.postpone_count > 0)
    .sort((a, b) => b.postpone_count - a.postpone_count)
    .slice(0, limit);
}

export function totalPostponements(tasks: Task[]): number {
  return tasks.reduce((sum, t) => sum + t.postpone_count, 0);
}

/** Quantas tarefas abertas ficaram sem avaliação. O próprio número é um insight. */
export function unevaluatedCount(tasks: Task[], now: Date = new Date()): number {
  return tasks.filter((t) => isOpen(t) && evaluationBucket(t, now) === 'unevaluated')
    .length;
}

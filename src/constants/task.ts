/**
 * Rótulos e ordenação de tarefas.
 *
 * Mesmo padrão de `fail-reasons.ts`: `satisfies Record<...>` faz o compilador recusar um
 * enum ampliado sem rótulo correspondente. Foi a ausência dessa amarra que produziu o
 * defeito D4, em que um mapa de rótulos paralelo ficou fora de sincronia com o enum e o
 * gráfico passou a exibir a chave crua.
 */

import type { TaskDifficulty, TaskPriority, TaskStatus } from '../types/domain';

export const TASK_STATUS_LABELS = {
  planned: 'Planejada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  failed: 'Não realizada',
  cancelled: 'Cancelada',
} satisfies Record<TaskStatus, string>;

export const PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
} satisfies Record<TaskPriority, string>;

/**
 * Só alta e crítica ganham marcação visual.
 *
 * A seção 37 alerta contra transformar tudo em "alta prioridade". Se as quatro
 * prioridades tivessem cor, a lista inteira ficaria colorida e a distinção perderia o
 * sentido — o padrão é média, e o padrão não precisa de destaque.
 */
export const PRIORITY_ACCENT: Record<TaskPriority, string | null> = {
  low: null,
  medium: null,
  high: 'bg-amber-500',
  critical: 'bg-red-500',
};

export const DIFFICULTY_LABELS = {
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
} satisfies Record<TaskDifficulty, string>;

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'critical', label: 'Crítica' },
];

export const DIFFICULTY_OPTIONS: { value: TaskDifficulty; label: string }[] = [
  { value: 'easy', label: 'Fácil' },
  { value: 'medium', label: 'Média' },
  { value: 'hard', label: 'Difícil' },
];

/** Durações oferecidas no formulário. Substituem o `duration_estimated: 60` fixo (D10). */
export const DURATION_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Não estimar' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
];

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}
